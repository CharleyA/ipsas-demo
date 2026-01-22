import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { VoucherService } from "@/lib/services/voucher.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const { notes } = await authReq.json().catch(() => ({}));
      const voucher = await VoucherService.approve(id, authReq.user.userId, notes);
      return NextResponse.json(voucher);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "BURSAR"]); // Headmaster/Bursar level
}
