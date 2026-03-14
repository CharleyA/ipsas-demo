import { NextRequest } from "next/server";
import { FiscalPeriodService } from "@/lib/services";
import { createFiscalPeriodSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organisationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const options = {
      year: searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined,
      status: searchParams.get("status") ?? undefined,
    };
    
    const periods = await FiscalPeriodService.listByOrganisation(organisationId, options);
    return successResponse(periods);
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
    const searchParams = request.nextUrl.searchParams;
    const generateYear = searchParams.get("generateYear");
    
    if (generateYear) {
      const periods = await FiscalPeriodService.generatePeriodsForYear(
        organisationId, 
        parseInt(generateYear), 
        actorId
      );
      return successResponse(periods, 201);
    }
    
    const body = await request.json();
    const data = createFiscalPeriodSchema.parse({ ...body, organisationId });
    
    const period = await FiscalPeriodService.create(data, actorId);
    return successResponse(period, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
