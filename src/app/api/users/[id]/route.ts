import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { updateUserSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth, requireOrganisationId } from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorId = requireAuth(request);
    const body = await request.json();
    const { role, ...userData } = body;
    
    const validatedData = updateUserSchema.parse(userData);
    const user = await UserService.update(id, validatedData, actorId);

    if (role) {
      const organisationId = requireOrganisationId(request);
      await UserService.addToOrganisation({
        userId: id,
        organisationId,
        role,
        isApprover: body.isApprover ?? false,
      }, actorId);
    }

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorId = requireAuth(request);
    const organisationId = requireOrganisationId(request);
    
    // Default to removing from organisation
    await UserService.removeFromOrganisation(organisationId, id, actorId);
    
    return successResponse({ message: "User removed from organisation" });
  } catch (error) {
    return handleApiError(error);
  }
}
