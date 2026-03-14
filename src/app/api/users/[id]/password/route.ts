import { NextRequest } from "next/server";
import { UserService } from "@/lib/services";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";
import { z } from "zod";

const changePasswordSchema = z.object({
  password: z.string().min(8).max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorId = requireAuth(request);
    const body = await request.json();
    const { password } = changePasswordSchema.parse(body);
    
    await UserService.changePassword(id, password, actorId);
    
    return successResponse({ message: "Password updated successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
