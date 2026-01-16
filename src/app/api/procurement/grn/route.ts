import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { GRNService } from "@/lib/services/procurement.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const grns = await GRNService.listByOrganisation(authReq.user.organisationId);
    return NextResponse.json(grns);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const grn = await GRNService.create(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(grn);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
