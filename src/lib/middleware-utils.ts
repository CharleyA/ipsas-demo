import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organisationId: string;
  };
}

export async function withAuth(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  roles?: string[]
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const decoded = AuthService.verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (roles && !roles.includes(decoded.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  (req as any).user = decoded;
  return handler(req as any);
}
