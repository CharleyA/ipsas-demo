import { NextRequest } from "next/server";
import { OrganisationService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth, errorResponse, requireOrganisationId } from "@/lib/api-utils";
import { z } from "zod";

const updateOrgCurrencySchema = z.object({
  isActive: z.boolean().optional(),
  isBaseCurrency: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; code: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const sessionOrgId = requireOrganisationId(request);
    const { id, code } = await params;
    
    if (id !== sessionOrgId) {
      return errorResponse("Access denied", 403);
    }

    const body = await request.json();
    const data = updateOrgCurrencySchema.parse(body);
    
    const orgCurrency = await OrganisationService.updateCurrency(id, code, data, actorId);
    return successResponse(orgCurrency);
  } catch (error) {
    return handleApiError(error);
  }
}
