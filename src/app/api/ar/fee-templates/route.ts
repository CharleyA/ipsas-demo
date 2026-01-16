import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { FeeTemplateService } from "@/lib/services/fee-generation.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const templates = await FeeTemplateService.listByOrganisation(
      authReq.user.organisationId
    );
    return NextResponse.json(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const template = await FeeTemplateService.create(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(template);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
