import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { addUserToOrganisationSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const body = await request.json();
    const data = addUserToOrganisationSchema.parse(body);
    
    const result = await UserService.addToOrganisation(data, actorId);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
