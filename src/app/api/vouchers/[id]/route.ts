import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { VoucherService } from "@/lib/services/voucher.service";
import { updateVoucherSchema } from "@/lib/validations/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;
  
  return withAuth(req, async (authReq) => {
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const validatedData = updateVoucherSchema.parse(body);
      
      const voucher = await VoucherService.update(id, validatedData, authReq.user.userId);
      return NextResponse.json(voucher);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT", "BURSAR"]);
}
