import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { updateOrganisationUserSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth, requireOrganisationId, errorResponse } from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const organisationId = requireOrganisationId(request);
    const { userId } = await params;

    const body = await request.json();
    const data = updateOrganisationUserSchema.parse(body);

    const result = await UserService.updateOrganisationUser(organisationId, userId, data, actorId);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const organisationId = requireOrganisationId(request);
    const { userId } = await params;

    const result = await UserService.removeFromOrganisation(organisationId, userId, actorId);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
