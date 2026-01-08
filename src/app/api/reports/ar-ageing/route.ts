import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const dateStr = searchParams.get("date");
    const format = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getARAgeing(authReq.user.organisationId, date);

    if (format === "json") {
      return NextResponse.json(report);
    }

    const columns: ExportColumn[] = [
      { header: "Student Name", key: "name", width: 30 },
      { header: "Total", key: "total" },
      { header: "Current", key: "current" },
      { header: "31-60 Days", key: "p30" },
      { header: "61-90 Days", key: "p60" },
      { header: "91-120 Days", key: "p90" },
      { header: "121+ Days", key: "p120" },
    ];

    const content = await ReportExporter.export(format, report.rows, columns, "AR Ageing Report");
    return ReportExporter.getResponse(format, content, "AR Ageing Report");
  });
}
