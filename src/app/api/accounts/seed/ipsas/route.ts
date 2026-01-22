import { NextRequest } from "next/server";
import { AccountService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth, requireOrganisationId } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const organisationId = requireOrganisationId(request);
    
    const results = await AccountService.seedIPSAS(organisationId, actorId);
    await AccountService.seedCashFlowLines(organisationId, actorId);
    return successResponse(results, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
