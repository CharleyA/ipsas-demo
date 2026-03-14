import { DocumentationService } from "@/lib/services";
import { handleApiError, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const pages = await DocumentationService.listPublished();
    return successResponse(pages);
  } catch (error) {
    return handleApiError(error);
  }
}
