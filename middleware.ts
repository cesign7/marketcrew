import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isAuthRequired, sanitizeNextPath, verifyOwnerSessionToken } from "./src/lib/auth/session";

const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export async function middleware(request: NextRequest) {
  if (!isAuthRequired() || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authorized = await verifyOwnerSessionToken(token);
  if (authorized) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "대표 로그인 후 이용할 수 있습니다.",
        },
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
