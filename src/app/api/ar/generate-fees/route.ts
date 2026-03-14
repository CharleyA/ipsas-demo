import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { FeeGenerationService } from "@/lib/services/fee-generation.service";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const result = await FeeGenerationService.generate(
        {
          organisationId: authReq.user.organisationId,
          templateId: body.templateId,
          grades: body.grades,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
        },
        authReq.user.userId
      );
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
