import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const format = (searchParams.get("format") || "json") as ExportFormat;

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await ReportService.getCashflow(
      authReq.user.organisationId,
      startDate,
      endDate
    );

    if (format === "json") {
      return NextResponse.json(report);
    }

    const columns: ExportColumn[] = [
      { header: "Code", key: "code" },
      { header: "Line Name", key: "name", width: 40 },
      { header: "Amount", key: "amount" },
    ];

    const flattenRows = (rows: any[], level = 0): any[] => {
      const result: any[] = [];
      rows.forEach((row) => {
        result.push({
          code: row.code,
          name: "  ".repeat(level) + row.name,
          amount: row.amount,
        });
        if (row.children && row.children.length > 0) {
          result.push(...flattenRows(row.children, level + 1));
        }
      });
      return result;
    };

    const data = flattenRows(report.rows);

    const content = await ReportExporter.export(format, data, columns, "Cash Flow Statement");
    return ReportExporter.getResponse(format, content, "Cash Flow Statement");
  });
}
