import { NextRequest } from "next/server";
import { OrganisationService } from "@/lib/services";
import { updateOrganisationSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { id } = await params;
    const body = await request.json();
    const data = updateOrganisationSchema.parse(body);
    
    const organisation = await OrganisationService.update(id, data, actorId);
    return successResponse(organisation);
  } catch (error) {
    return handleApiError(error);
  }
}
