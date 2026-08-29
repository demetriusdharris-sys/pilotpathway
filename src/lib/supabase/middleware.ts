import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/stages"];

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  // Before the keys are set, let every request through untouched so the
  // marketing site still renders. Auth pages surface the setup message.
  if (!env) {
    return NextResponse.next();
  }

  // Only touch page navigations.
  //
  // NextResponse.next({ request }) clones the incoming request, body included.
  // On a Server Action POST to a page route that clone blocked and never
  // returned, and the function burned its full 25s budget before Vercel killed
  // it with MIDDLEWARE_INVOCATION_TIMEOUT -- with no outgoing requests logged,
  // because it never got as far as calling Supabase. Login and signup are
  // Server Actions, so both were dead while GET routes stayed fine.
  //
  // Middleware does not need to do anything on those POSTs. Server Actions and
  // route handlers each build their own Supabase client and check auth
  // themselves; middleware refreshes the session cookie on navigation and
  // guards page routes. Skipping non-GET here removes the hang without
  // weakening either job.
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between createServerClient and getUser. A simple mistake
  // here can make it very hard to debug random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Return supabaseResponse as-is. If you build your own response, copy over
  // its cookies first or the session will fall out of sync.
  return supabaseResponse;
}
