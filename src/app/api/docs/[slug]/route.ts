import { NextRequest } from "next/server";
import { z } from "zod";
import { DocumentationService } from "@/lib/services";
import {
  errorResponse,
  handleApiError,
  requireAuth,
  requireOrganisationId,
  successResponse,
} from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateDocSchema = z.object({
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  content: z.string().min(1),
  isPublished: z.boolean().optional(),
});

async function ensureAdmin(request: NextRequest) {
  const actorId = requireAuth(request);
  const organisationId = requireOrganisationId(request);

  const records = await prisma.$queryRaw<Array<{ role: string }>>`
    select role
    from organisation_users
    where "organisationId" = ${organisationId}
      and "userId" = ${actorId}
    limit 1
  `;

  if (!records[0] || records[0].role !== "ADMIN") {
    throw new Error("Access denied");
  }

  return actorId;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await DocumentationService.getBySlug(slug);

    if (!page) {
      return errorResponse("Documentation not found", 404);
    }

    return successResponse(page);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const actorId = await ensureAdmin(request);
    const { slug } = await params;
    const body = await request.json();
    const data = updateDocSchema.parse(body);

    const page = await DocumentationService.upsert(slug, data, actorId);
    if (!page) {
      return errorResponse("Documentation not found", 404);
    }

    return successResponse(page);
  } catch (error) {
    return handleApiError(error);
  }
}
