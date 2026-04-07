import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400, errors?: unknown) {
  return NextResponse.json(
    { success: false, error: message, errors },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return errorResponse("Validation failed", 400, error.issues);
  }

  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      return errorResponse(error.message, 404);
    }
    if (error.message.includes("already exists") || error.message.includes("Unique constraint")) {
      return errorResponse("Resource already exists", 409);
    }
    if (error.message.includes("Cannot") || error.message.includes("violation")) {
      return errorResponse(error.message, 400);
    }
    return errorResponse(error.message, 500);
  }

  return errorResponse("An unexpected error occurred", 500);
}

export function getActorId(request: Request): string | null {
  return request.headers.get("x-user-id");
}

export function getOrganisationId(request: Request): string | null {
  return request.headers.get("x-organisation-id");
}

export function requireAuth(request: Request): string {
  const userId = getActorId(request);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export function requireOrganisationId(request: Request): string {
  const orgId = getOrganisationId(request);
  if (!orgId) {
    throw new Error("Organisation context required");
  }
  return orgId;
}
