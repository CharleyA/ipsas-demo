import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { FeeGenerationService } from "@/lib/services/fee-generation.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const batches = await FeeGenerationService.listBatches(
      authReq.user.organisationId
    );
    return NextResponse.json(batches);
  });
}
