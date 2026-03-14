import { NextRequest } from "next/server";
import { CurrencyService } from "@/lib/services";
import { createExchangeRateSchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const options = {
      fromCurrency: searchParams.get("from") ?? undefined,
      toCurrency: searchParams.get("to") ?? undefined,
      startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
      endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
    };
    
    const rates = await CurrencyService.listExchangeRates(options);
    return successResponse(rates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const body = await request.json();
    const data = createExchangeRateSchema.parse(body);
    
    const rate = await CurrencyService.createExchangeRate(data, actorId);
    return successResponse(rate, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
