import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { AuthService } from "@/lib/services/auth.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const user = await AuthService.me(authReq.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  });
}
