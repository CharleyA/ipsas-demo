import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { VoucherService } from "@/lib/services/voucher.service";
import { updateVoucherSchema } from "@/lib/validations/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    const { id } = await params;
    const voucher = await VoucherService.findById(id);
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }
    
    if (voucher.organisationId !== authReq.user.organisationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(voucher);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await authReq.json();
      const validatedData = updateVoucherSchema.parse(body);
      
      const voucher = await VoucherService.update(id, validatedData, authReq.user.userId);
      return NextResponse.json(voucher);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT", "BURSAR"]);
}
