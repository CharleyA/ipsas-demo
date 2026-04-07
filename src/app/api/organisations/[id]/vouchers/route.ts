import { NextRequest } from "next/server";
import { VoucherService } from "@/lib/services";
import { createVoucherSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organisationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const options = {
      status: (searchParams.get("status") ?? undefined) as any,
      type: (searchParams.get("type") ?? undefined) as any,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    };
    
    const vouchers = await VoucherService.listByOrganisation(organisationId, options);
    return successResponse(vouchers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { id: organisationId } = await params;
    const body = await request.json();
    const data = createVoucherSchema.parse({ ...body, organisationId });
    
    const voucher = await VoucherService.create(data, actorId);
    return successResponse(voucher, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
