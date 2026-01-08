import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getTrialBalance(authReq.user.organisationId, date);
    return NextResponse.json(report);
  });
}
