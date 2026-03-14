import { NextRequest } from "next/server";
import { OrganisationService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth, errorResponse, requireOrganisationId } from "@/lib/api-utils";
import { z } from "zod";

const addCurrencySchema = z.object({
  currencyCode: z.string().length(3),
  isBaseCurrency: z.boolean().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionOrgId = requireOrganisationId(request);
    const { id } = await params;
    
    if (id !== sessionOrgId) {
      return errorResponse("Access denied", 403);
    }

    const currencies = await OrganisationService.getCurrencies(id);
    return successResponse(currencies);
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
    const sessionOrgId = requireOrganisationId(request);
    const { id } = await params;
    
    if (id !== sessionOrgId) {
      return errorResponse("Access denied", 403);
    }

    const body = await request.json();
    const { currencyCode, isBaseCurrency } = addCurrencySchema.parse(body);
    
    const orgCurrency = await OrganisationService.addCurrency(id, currencyCode, isBaseCurrency, actorId);
    return successResponse(orgCurrency, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
