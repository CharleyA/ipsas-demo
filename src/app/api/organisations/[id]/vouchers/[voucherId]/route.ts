import { NextRequest } from "next/server";
import { VoucherService } from "@/lib/services";
import { updateVoucherSchema, approveVoucherSchema, rejectVoucherSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; voucherId: string }> }
) {
  try {
    const { voucherId } = await params;
    const voucher = await VoucherService.findById(voucherId);
    
    if (!voucher) {
      return errorResponse("Voucher not found", 404);
    }
    
    return successResponse(voucher);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voucherId: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { voucherId } = await params;
    const body = await request.json();
    const data = updateVoucherSchema.parse(body);
    
    const voucher = await VoucherService.update(voucherId, data, actorId);
    return successResponse(voucher);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voucherId: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { voucherId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    
    switch (action) {
      case "submit": {
        const voucher = await VoucherService.submit(voucherId, actorId);
        return successResponse(voucher);
      }
      
      case "approve": {
        const body = await request.json().catch(() => ({}));
        const data = approveVoucherSchema.parse(body);
        const voucher = await VoucherService.approve(voucherId, actorId, data.approvalNotes);
        return successResponse(voucher);
      }
      
      case "reject": {
        const body = await request.json();
        const data = rejectVoucherSchema.parse(body);
        const voucher = await VoucherService.reject(voucherId, actorId, data.rejectionReason);
        return successResponse(voucher);
      }
      
      case "post": {
        const result = await VoucherService.post(voucherId, actorId);
        return successResponse(result);
      }
      
      case "reverse": {
        const reversal = await VoucherService.reverse(voucherId, actorId);
        return successResponse(reversal);
      }
      
      default:
        return errorResponse("Invalid action. Use: submit, approve, reject, post, reverse", 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
