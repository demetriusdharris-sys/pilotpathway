import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Page navigations only.
     *
     * Excludes api routes, which build their own Supabase client and enforce
     * auth themselves, and every Next internal and static asset. Every request
     * middleware does not need to see is a request that cannot time out in it.
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
