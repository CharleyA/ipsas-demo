import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { StatementService } from "@/lib/services";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { organisationId, userId } = authReq.user;
    
    const results = await StatementService.seedStatementStructure(organisationId, userId);
    
    return NextResponse.json({
      message: "Report structure seeded successfully",
      results
    });
  });
}
