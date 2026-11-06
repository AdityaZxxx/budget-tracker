import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

const authPages = ["/sign-in", "/sign-up"];
// Invite pages are public: accepting an invite is what signs a new user in.
const publicPrefixes = ["/invite"];
const protectedPrefixes = ["/transactions", "/manage", "/wizard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isAuthPage = authPages.some((page) => pathname.startsWith(page));
  const isPublic = publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthApi = pathname.startsWith("/api/auth");
  // Cron routes authenticate with a bearer secret instead of a session.
  const isCronApi = pathname.startsWith("/api/cron");
  const isApiRoute = pathname.startsWith("/api");
  const isProtected =
    !isPublic &&
    !isCronApi &&
    (pathname === "/" ||
      protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
      (isApiRoute && !isAuthApi));

  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!sessionCookie && isProtected) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
