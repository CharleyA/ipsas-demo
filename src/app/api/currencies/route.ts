import { NextRequest } from "next/server";
import { CurrencyService } from "@/lib/services";
import { createCurrencySchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") !== "false";
    
    const currencies = await CurrencyService.list(activeOnly);
    return successResponse(currencies);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorId = requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    
    if (action === "seed") {
      const currencies = await CurrencyService.seedDefaultCurrencies(actorId);
      return successResponse(currencies, 201);
    }
    
    const body = await request.json();
    const data = createCurrencySchema.parse(body);
    
    const currency = await CurrencyService.create(data, actorId);
    return successResponse(currency, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
