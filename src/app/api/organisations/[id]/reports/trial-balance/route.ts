import { NextRequest } from "next/server";
import { AccountService } from "@/lib/services";
import { successResponse, handleApiError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organisationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get("asOfDate") ? new Date(searchParams.get("asOfDate")!) : undefined;
    
    const trialBalance = await AccountService.getTrialBalance(organisationId, asOfDate);
    return successResponse(trialBalance);
  } catch (error) {
    return handleApiError(error);
  }
}
