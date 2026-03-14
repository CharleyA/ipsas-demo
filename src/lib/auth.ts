import * as jose from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  organisationId: string;
  role: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new jose.SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, encodedSecret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyAuth(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.split(" ")[1] 
    : req.cookies.get("token")?.value;

  if (!token) return null;
  return verifyToken(token);
}

export function enforceRole(payload: JWTPayload | null, allowedRoles: string[]) {
  if (!payload) {
    throw new Error("Unauthorized");
  }

  if (!allowedRoles.includes(payload.role)) {
    throw new Error("Forbidden");
  }
}

export async function getAuthContext(req: NextRequest): Promise<JWTPayload | null> {
  return verifyAuth(req);
}
