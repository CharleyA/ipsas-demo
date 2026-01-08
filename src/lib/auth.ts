import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

export interface JWTPayload {
  userId: string;
  email: string;
  organisationId: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getAuthContext(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
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
