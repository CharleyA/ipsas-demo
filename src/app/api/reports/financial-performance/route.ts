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
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const exportFormat = (searchParams.get("format") || "json") as ExportFormat;

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const report = await ReportService.getFinancialPerformance(
      authReq.user.organisationId,
      startDate,
      endDate
    );

    if (exportFormat === "json") {
      return NextResponse.json(report);
    }

    const org = await prisma.organisation.findUnique({ 
      where: { id: authReq.user.organisationId } 
    });

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

    const content = await ReportExporter.export(exportFormat, data, columns, "Statement of Financial Performance", {
      title: "Statement of Financial Performance",
      subtitle: `For the period ${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")}`,
      organisationName: org?.name || "Organisation",
      orientation: "portrait",
    });
    return ReportExporter.getResponse(exportFormat, content, "Financial Performance");
  });
}
