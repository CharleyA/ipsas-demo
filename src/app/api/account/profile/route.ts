import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { z } from "zod";
import { UserService } from "@/lib/services";

const accountProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(500000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const validated = accountProfileSchema.parse(body);

      const updated = await UserService.update(authReq.user.id, validated, authReq.user.id);
      return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 400 });
    }
  });
}
