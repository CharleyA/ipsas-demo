import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const accountId = searchParams.get("accountId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!accountId || !startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await ReportService.getGeneralLedger(
      authReq.user.organisationId,
      accountId,
      startDate,
      endDate
    );
    return NextResponse.json(report);
  });
}
