// i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const SUPPORTED_LOCALES = ["hr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "hr";

function isLocale(v: string | undefined | null): v is Locale {
  return v === "hr" || v === "en";
}

function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  // Very small parser: first match wins.
  const parts = header.split(",").map((p) => p.trim().split(";")[0].toLowerCase());
  for (const p of parts) {
    if (p.startsWith("en")) return "en";
    if (p.startsWith("hr")) return "hr";
  }
  return DEFAULT_LOCALE;
}

export async function resolveLocale(): Promise<Locale> {
  // 1. Logged-in user: profiles.language wins.
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .single();
      if (isLocale(profile?.language)) return profile.language;
    }
  } catch (e) {
    console.error("[i18n] profile lookup failed, falling back to cookie/Accept-Language", e);
    // fall through
  }

  // 2. Cookie override (also used pre-login).
  const ck = (await cookies()).get("NEXT_LOCALE")?.value;
  if (isLocale(ck)) return ck;

  // 3. Accept-Language header.
  const h = await headers();
  return pickFromAcceptLanguage(h.get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
