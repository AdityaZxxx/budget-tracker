import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

// Invite pages are public: accepting an invite is what signs a new user in.
const publicPrefixes = ["/invite"];
const protectedPrefixes = ["/transactions", "/manage", "/wizard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isPublic = publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthApi = pathname.startsWith("/api/auth");
  // Cron routes authenticate with a bearer secret instead of a session.
  const isCronApi = pathname.startsWith("/api/cron");
  // The MCP endpoint authenticates with an API token instead of a session.
  const isTokenApi =
    pathname === "/api/mcp" || pathname.startsWith("/api/mcp/");
  const isApiRoute = pathname.startsWith("/api");
  const isProtected =
    !isPublic &&
    !isCronApi &&
    !isTokenApi &&
    (pathname === "/" ||
      protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
      (isApiRoute && !isAuthApi));

  // An auth page never redirects on cookie presence alone. The cookie can
  // outlive the session it names, and the dashboard then sends the browser
  // back here, so the two redirects used to bounce forever. The auth pages
  // validate the session themselves before redirecting a signed-in Member.

  if (!sessionCookie && isProtected) {
    // API routes answer with JSON so fetchers can tell "not signed in" from
    // "server broken"; only browser navigations redirect to sign-in.
    if (isApiRoute) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
