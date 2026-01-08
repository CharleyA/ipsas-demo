import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { createUserSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, errorResponse, requireAuth, requireOrganisationId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const organisationId = requireOrganisationId(request);
    
    const users = await UserService.listByOrganisation(organisationId);
    return successResponse(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);
    
    const existing = await UserService.findByEmail(data.email);
    if (existing) {
      return errorResponse("Email already registered", 409);
    }
    
    const user = await UserService.create(data);
    return successResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
