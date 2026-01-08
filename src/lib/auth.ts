import * as jose from "jose";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  organisationId: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
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
