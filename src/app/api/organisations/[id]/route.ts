import { NextRequest } from "next/server";
import { OrganisationService } from "@/lib/services";
import { updateOrganisationSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth, errorResponse, requireOrganisationId } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionOrgId = requireOrganisationId(request);
    const { id } = await params;
    
    // In single-organisation mode, user can only access their own organisation
    if (id !== sessionOrgId) {
      return errorResponse("Access denied to this organisation", 403);
    }

    const organisation = await OrganisationService.findById(id);
    
    if (!organisation) {
      return errorResponse("Organisation not found", 404);
    }
    
    return successResponse(organisation);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const sessionOrgId = requireOrganisationId(request);
    const { id } = await params;
    
    // In single-organisation mode, user can only update their own organisation
    if (id !== sessionOrgId) {
      return errorResponse("Access denied to this organisation", 403);
    }

    const body = await request.json();
    const data = updateOrganisationSchema.parse(body);
    
    const organisation = await OrganisationService.update(id, data, actorId);
    return successResponse(organisation);
  } catch (error) {
    return handleApiError(error);
  }
}
