import { NextRequest } from "next/server";
import { OrganisationService } from "@/lib/services";
import { createOrganisationSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? undefined;
    const isActive = searchParams.get("isActive") === "true" ? true : 
                     searchParams.get("isActive") === "false" ? false : undefined;
    
    const organisations = await OrganisationService.list({ type, isActive });
    return successResponse(organisations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const body = await request.json();
    const data = createOrganisationSchema.parse(body);
    
    const organisation = await OrganisationService.create(data, actorId);
    return successResponse(organisation, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
