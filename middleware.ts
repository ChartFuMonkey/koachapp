import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isCoach = user?.id === process.env.NEXT_PUBLIC_COACH_UUID;

  // / — if already logged in, redirect to /app or /coach
  if (pathname === "/") {
    if (user) {
      const destination = isCoach ? "/coach" : "/app";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return supabaseResponse;
  }

  // /login — if already logged in, redirect to /app or /coach
  if (pathname === "/login") {
    if (user) {
      const role = request.nextUrl.searchParams.get("role");
      // If coach explicitly chose "login as client", send them to /app
      const destination = role === "client" ? "/app" : isCoach ? "/coach" : "/app";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return supabaseResponse;
  }

  // /app/* — if not logged in, redirect to /login
  if (pathname.startsWith("/app")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // /coach/* — if not logged in, redirect to /login; if not coach, redirect to /app
  if (pathname.startsWith("/coach")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isCoach) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/app/:path*", "/coach/:path*", "/login", "/set-password"],
};
