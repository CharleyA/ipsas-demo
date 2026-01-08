import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ExceptionReportService } from "@/lib/services/exception-report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async (authReq) => {
      const { searchParams } = new URL(authReq.url);
      const startDateStr = searchParams.get("startDate");
      const endDateStr = searchParams.get("endDate");
      const section = searchParams.get("section");

      const startDate = startDateStr ? new Date(startDateStr) : undefined;
      const endDate = endDateStr ? new Date(endDateStr) : undefined;
      const orgId = authReq.user.organisationId;

      if (section) {
        switch (section) {
          case "summary":
            return NextResponse.json(await ExceptionReportService.getSummary(orgId, startDate, endDate));
          case "backdated":
            return NextResponse.json(await ExceptionReportService.getBackdatedPostings(orgId, startDate, endDate));
          case "reopened":
            return NextResponse.json(await ExceptionReportService.getReopenedPeriods(orgId, startDate, endDate));
          case "attachments":
            return NextResponse.json(await ExceptionReportService.getMissingAttachments(orgId, startDate, endDate));
          case "journals":
            return NextResponse.json(await ExceptionReportService.getManualJournals(orgId, startDate, endDate));
          case "overrides":
            return NextResponse.json(await ExceptionReportService.getPeriodOverrides(orgId, startDate, endDate));
          case "reversals":
            return NextResponse.json(await ExceptionReportService.getReversals(orgId, startDate, endDate));
          default:
            return NextResponse.json({ error: "Invalid section" }, { status: 400 });
        }
      }

      const report = await ExceptionReportService.getFullReport(orgId, startDate, endDate);
      return NextResponse.json(report);
    },
    ["AUDITOR", "ADMIN", "HEADMASTER", "BURSAR"]
  );
}
