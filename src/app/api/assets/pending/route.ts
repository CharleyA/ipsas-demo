import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { PendingAssetService } from "@/lib/services/asset.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const pending = await PendingAssetService.listByOrganisation(
      authReq.user.organisationId
    );
    return NextResponse.json(pending);
  });
}
