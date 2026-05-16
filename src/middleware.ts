import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "./lib/session";

// Routes that don't require an active session.
const PUBLIC = new Set(["/", "/api/select-profile", "/api/sign-out"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret || !(await verifySessionToken(token, secret))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals, static files, and avatar assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avatars/).*)"],
};
