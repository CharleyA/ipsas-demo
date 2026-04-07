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
    const fundId = searchParams.get("fundId") || undefined;
    const costCentreId = searchParams.get("costCentreId") || undefined;
    const reportingCurrency = searchParams.get("reportingCurrency") || undefined;
    const exportFormat = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getTrialBalance(authReq.user.organisationId, date, {
      fundId,
      costCentreId,
      reportingCurrency,
    });

    if (exportFormat === "json") {
      return NextResponse.json(report);
    }

    const org = await prisma.organisation.findUnique({ 
      where: { id: authReq.user.organisationId } 
    });

    const columns: ExportColumn[] = [
      { header: "Code", key: "code" },
      { header: "Account Name", key: "name", width: 30 },
      { header: "Type", key: "type" },
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
      { header: "Net Balance", key: "balance" },
    ];

    const content = await ReportExporter.export(exportFormat, report.rows, columns, "Trial Balance", {
      title: "Trial Balance",
      subtitle: `As at ${format(date, "MMMM d, yyyy")} — ${report.reportingCurrency} Basis`,
      organisationName: org?.name || "Organisation",
      orientation: "portrait",
    });
    return ReportExporter.getResponse(exportFormat, content, "Trial Balance");
  });
}
