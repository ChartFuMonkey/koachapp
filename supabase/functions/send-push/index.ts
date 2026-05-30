import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// VAPID keys from environment (server-side only, never sent to browser)
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:igor.milihram@gmail.com";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://koachapp.vercel.app";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Web Push helpers (Web Crypto API, no npm dependencies) ---

function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b.length % 4)) % 4);
  const bin = atob(b + pad);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const len = bufs.reduce((s, b) => s + b.length, 0);
  const r = new Uint8Array(len);
  let off = 0;
  for (const b of bufs) {
    r.set(b, off);
    off += b.length;
  }
  return r;
}

async function createVapidAuth(
  endpoint: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const publicKeyBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  const privateKeyBytes = b64urlDecode(VAPID_PRIVATE_KEY);

  // Build JWK from raw P-256 keys
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: b64url(publicKeyBytes.slice(1, 33)),
    y: b64url(publicKeyBytes.slice(33, 65)),
    d: b64url(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(
    enc.encode(
      JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })
    )
  );

  const sigInput = enc.encode(`${header}.${payload}`);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, sigInput)
  );

  return `vapid t=${header}.${payload}.${b64url(sig)}, k=${VAPID_PUBLIC_KEY}`;
}

async function encryptPayload(
  clientPubB64: string,
  clientAuthB64: string,
  payload: string
): Promise<Uint8Array> {
  const clientPubRaw = b64urlDecode(clientPubB64);
  const clientAuth = b64urlDecode(clientAuthB64);
  const enc = new TextEncoder();

  // Import client's public key
  const clientPub = await crypto.subtle.importKey(
    "raw",
    clientPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // Generate ephemeral server key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKP.publicKey)
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPub },
    serverKP.privateKey,
    256
  );

  // RFC 8291 key derivation
  // Step 1: IKM = HKDF(salt=clientAuth, ikm=sharedSecret, info="WebPush: info\0"||ua_pub||as_pub, 32)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveBits"]
  );
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    clientPubRaw,
    serverPubRaw
  );
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: clientAuth, info: keyInfo },
    sharedKey,
    256
  );

  // Step 2: Derive CEK and nonce from IKM with random salt (RFC 8188)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    ikm,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const cek = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode("Content-Encoding: aes128gcm\0"),
    },
    ikmKey,
    128
  );
  const nonce = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode("Content-Encoding: nonce\0"),
    },
    ikmKey,
    96
  );

  // Encrypt with AES-128-GCM (payload + 0x02 padding delimiter)
  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const padded = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, padded)
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, new Uint8Array([65]), serverPubRaw, ciphertext);
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<number> {
  const body = await encryptPayload(sub.p256dh, sub.auth, payload);
  const authorization = await createVapidAuth(sub.endpoint);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(body.length),
      Authorization: authorization,
      TTL: "86400",
      Urgency: "normal",
    },
    body,
  });

  return res.status;
}

// --- CORS headers helper ---

function corsHeaders(origin?: string | null) {
  const allowedOrigin =
    origin && origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// --- Main handler ---

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(origin),
    });
  }

  const cors = corsHeaders(origin);

  try {
    // Auth check: verify Bearer token matches service role key
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const { client_id, title, body, url } = await req.json();

    if (!client_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing client_id, title, or body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    // Validate client_id is a valid UUID
    if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid client_id format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    // Validate title and body are strings with reasonable length
    if (typeof title !== "string" || title.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid title" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }
    if (typeof body !== "string" || body.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Invalid body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }
    if (url !== undefined && (typeof url !== "string" || url.length > 512)) {
      return new Response(
        JSON.stringify({ error: "Invalid url" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("client_id", client_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    let sent = 0;
    for (const sub of subscriptions || []) {
      try {
        const status = await sendPush(sub, JSON.stringify({ title, body, url }));
        if (status >= 200 && status < 300) {
          sent++;
        } else if (status === 410) {
          // Subscription expired, clean up
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      } catch (err) {
        console.error("Push send error:", err);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
});
