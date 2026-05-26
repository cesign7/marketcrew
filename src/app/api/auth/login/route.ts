import { NextResponse } from "next/server";
import { verifyOwnerPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, createOwnerSessionToken, getOwnerSessionCookieOptions, isAuthConfigured, sanitizeNextPath } from "@/lib/auth/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/operations"));
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", nextPath);

  if (!isAuthConfigured()) {
    loginUrl.searchParams.set("error", "setup");
    return NextResponse.redirect(loginUrl, 303);
  }

  if (!(await verifyOwnerPassword(password))) {
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, await createOwnerSessionToken(), getOwnerSessionCookieOptions());
  return response;
}
