import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const report = await ReportService.getConsolidatedLedger(
      authReq.user.organisationId,
      new Date(startDateStr),
      new Date(endDateStr),
      {
        accountType: searchParams.get("accountType") || undefined,
        accountId: searchParams.get("accountId") || undefined,
        fundId: searchParams.get("fundId") || undefined,
        costCentreId: searchParams.get("costCentreId") || undefined,
        sourceModule: searchParams.get("sourceModule") || undefined,
        page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
        pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : 100,
        reportingCurrency: searchParams.get("reportingCurrency") || undefined,
      }
    );

    return NextResponse.json(report);
  });
}
