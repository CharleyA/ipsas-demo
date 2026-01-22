import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";
import prisma from "@/lib/db";
import { format } from "date-fns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const dateStr = searchParams.get("date");
    const exportFormat = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();
    const reportingCurrency = searchParams.get("reportingCurrency") || undefined;

    const report = await ReportService.getFinancialPosition(authReq.user.organisationId, date, { reportingCurrency });

    if (exportFormat === "json") {
      return NextResponse.json(report);
    }

    const org = await prisma.organisation.findUnique({ 
      where: { id: authReq.user.organisationId } 
    });

    const columns: ExportColumn[] = [
      { header: "Code", key: "code" },
      { header: "Line Name", key: "name", width: 40 },
      { header: `Amount (${report.reportingCurrency})`, key: "amount" },
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

    const content = await ReportExporter.export(exportFormat, data, columns, "Statement of Financial Position", {
      title: "Statement of Financial Position",
      subtitle: `As at ${format(date, "MMMM d, yyyy")}`,
      organisationName: org?.name || "Organisation",
      orientation: "portrait",
      summaryData: [
        { label: `Total Assets (${report.reportingCurrency})`, value: Number(report.summary.totalAssets) },
        { label: `Total Liabilities (${report.reportingCurrency})`, value: Number(report.summary.totalLiabilities) },
        { label: `Net Assets/Equity (${report.reportingCurrency})`, value: Number(report.summary.netAssets) },
      ]
    });
    return ReportExporter.getResponse(exportFormat, content, "Financial Position");
  });
}
