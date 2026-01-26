import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const MAINTENANCE_MODE = true;

  const { pathname } = req.nextUrl;

  if (!MAINTENANCE_MODE) return NextResponse.next();

  // allow maintenance page + assets
  if (pathname.startsWith("/maintenance")) return NextResponse.next();
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  return NextResponse.redirect(new URL("/maintenance", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
