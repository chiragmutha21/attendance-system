import jwt, { type JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "super_admin_session";
const SESSION_AGE_SECONDS = 60 * 60 * 12;

function getSecret() {
  return process.env.JWT_SECRET || "local-super-admin-secret";
}

function verifySession(token: string) {
  try {
    const payload = jwt.verify(token, getSecret()) as JwtPayload;
    return payload.role === "SUPER_ADMIN" && typeof payload.email === "string";
  } catch {
    return false;
  }
}

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value || "";

  if (!token || !verifySession(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const expectedEmail = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = process.env.SUPER_ADMIN_PASSWORD || "";

  if (!expectedEmail || !expectedPassword || email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid super admin credentials." }, { status: 401 });
  }

  const token = jwt.sign({ role: "SUPER_ADMIN", email }, getSecret(), { expiresIn: SESSION_AGE_SECONDS });
  const response = NextResponse.json({ authenticated: true });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
