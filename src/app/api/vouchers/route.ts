import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { VoucherService } from "@/lib/services/voucher.service";
import { createVoucherSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const validatedData = createVoucherSchema.parse(body);
      
      // Force organisationId to match user's organisation
      validatedData.organisationId = authReq.user.organisationId;
      
      const voucher = await VoucherService.create(validatedData, authReq.user.userId);
      return NextResponse.json(voucher, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT", "BURSAR"]);
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const vouchers = await VoucherService.listByOrganisation(authReq.user.organisationId, {
      status: status as any,
      type: type as any,
    });

    return NextResponse.json(vouchers);
  });
}
