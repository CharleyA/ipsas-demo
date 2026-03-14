import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/middleware-utils";
import { UserService } from "@/lib/services";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const { currentPassword, newPassword } = schema.parse(body);

      const isValid = await UserService.verifyPassword(authReq.user.email, currentPassword);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      await UserService.changePassword(authReq.user.id, newPassword, authReq.user.id);
      return NextResponse.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || error?.message || "Failed to change password";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
