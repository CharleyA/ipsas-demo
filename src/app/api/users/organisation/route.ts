import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { successResponse, handleApiError, errorResponse, requireAuth, requireOrganisationId } from "@/lib/api-utils";
import { z } from "zod";

const addUserToOrgSchema = z.object({
  userId: z.string().uuid(),
  organisationId: z.string().uuid(),
  role: z.enum(["ADMIN", "BURSAR", "ACCOUNTANT", "CLERK", "AUDITOR"]),
});

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const body = await request.json();
    const data = addUserToOrgSchema.parse(body);
    
    const result = await UserService.addToOrganisation(data, actorId);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
