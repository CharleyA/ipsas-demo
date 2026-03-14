import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { GuardianService } from "@/lib/services/party.service";
import { updateGuardianSchema } from "@/lib/validations/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validatedData = updateGuardianSchema.parse(body);
      const guardian = await GuardianService.update(id, validatedData, authReq.user.userId);
      return NextResponse.json(guardian);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      await GuardianService.remove(id, authReq.user.userId);
      return NextResponse.json({ ok: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
