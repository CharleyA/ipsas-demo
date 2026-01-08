import { NextRequest } from "next/server";
import { AccountService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organisationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? undefined;
    const isActive = searchParams.get("isActive") === "false" ? false : true;
    const tree = searchParams.get("tree") === "true";
    
    if (tree) {
      const chartOfAccounts = await AccountService.getChartOfAccounts(organisationId);
      return successResponse(chartOfAccounts);
    }
    
    const accounts = await AccountService.listByOrganisation(organisationId, { type, isActive });
    return successResponse(accounts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { id: organisationId } = await params;
    const body = await request.json();
    
    const { createAccountSchema } = await import("@/lib/validations/schemas");
    const data = createAccountSchema.parse({ ...body, organisationId });
    
    const account = await AccountService.create(data, actorId);
    return successResponse(account, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
