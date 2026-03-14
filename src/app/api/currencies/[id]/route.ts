import { NextRequest } from "next/server";
import { CurrencyService } from "@/lib/services";
import { updateCurrencySchema } from "@/lib/validations/schemas";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const data = updateCurrencySchema.parse(body);

    const currency = await CurrencyService.update(id, data, actorId);
    return successResponse(currency);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = requireAuth(request);
    const { id } = await params;

    await CurrencyService.delete(id, actorId);
    return successResponse({ message: "Currency deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
