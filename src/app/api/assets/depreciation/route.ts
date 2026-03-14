import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { AssetService } from "@/lib/services/asset.service";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const result = await AssetService.runDepreciation(
        authReq.user.organisationId,
        body.periodId,
        new Date(body.depreciationDate),
        authReq.user.userId
      );
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
