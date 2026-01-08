import { NextRequest } from "next/server";
import { FiscalPeriodService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; periodId: string }> }
) {
  try {
    const { periodId } = await params;
    const period = await FiscalPeriodService.findById(periodId);
    
    if (!period) {
      return errorResponse("Fiscal period not found", 404);
    }
    
    return successResponse(period);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; periodId: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { periodId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    
    switch (action) {
      case "close": {
        const period = await FiscalPeriodService.close(periodId, actorId);
        return successResponse(period);
      }
      
      case "lock": {
        const period = await FiscalPeriodService.lock(periodId, actorId);
        return successResponse(period);
      }
      
      case "reopen": {
        const period = await FiscalPeriodService.reopen(periodId, actorId);
        return successResponse(period);
      }
      
      default:
        return errorResponse("Invalid action. Use: close, lock, reopen", 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
