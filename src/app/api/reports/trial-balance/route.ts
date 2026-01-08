import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const dateStr = searchParams.get("date");
    const format = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getTrialBalance(authReq.user.organisationId, date);

    if (format === "json") {
      return NextResponse.json(report);
    }

    const columns: ExportColumn[] = [
      { header: "Code", key: "code" },
      { header: "Account Name", key: "name", width: 30 },
      { header: "Type", key: "type" },
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
      { header: "Net Balance", key: "balance" },
    ];

    const content = await ReportExporter.export(format, report.rows, columns, "Trial Balance");
    return ReportExporter.getResponse(format, content, "Trial Balance");
  });
}
