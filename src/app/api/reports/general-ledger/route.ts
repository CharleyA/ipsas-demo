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
    const accountId = searchParams.get("accountId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const voucherId = searchParams.get("voucherId");
      const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
      const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;
      const reportingCurrency = searchParams.get("reportingCurrency") || undefined;
      const exportFormat = (searchParams.get("format") || "json") as ExportFormat;


    if (!accountId || !startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // For exports, we fetch all records. For JSON, we use pagination if provided.
    const isExport = exportFormat !== "json";
    
    const report = await ReportService.getGeneralLedger(
      authReq.user.organisationId,
      accountId,
      startDate,
      endDate,
        { 
          voucherId: voucherId || undefined, 
          page: isExport ? undefined : page, 
          pageSize: isExport ? undefined : pageSize,
          reportingCurrency
        }

    );

    if (exportFormat === "json") {
      return NextResponse.json(report);
    }

    const org = await prisma.organisation.findUnique({ 
      where: { id: authReq.user.organisationId } 
    });

    const columns: ExportColumn[] = [
      { header: "Date", key: "date" },
      { header: "Entry #", key: "entryNumber" },
      { header: "Voucher #", key: "voucherNumber" },
      { header: "Description", key: "description", width: 40 },
      { header: `Debit (${report.reportingCurrency})`, key: "debit" },
      { header: `Credit (${report.reportingCurrency})`, key: "credit" },
      { header: `Balance (${report.reportingCurrency})`, key: "balance" },
    ];

    const reportName = `General Ledger - ${report.account.name}`;
    const content = await ReportExporter.export(exportFormat, report.entries, columns, reportName, {
      title: "General Ledger",
      subtitle: `${report.account.code} - ${report.account.name} | ${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")}`,
      organisationName: org?.name || "Organisation",
      orientation: "landscape",
      summaryData: [
        { label: "Opening Balance", value: Number(report.openingBalance) },
        { label: "Total Debits", value: Number(report.summary.totalDebits) },
        { label: "Total Credits", value: Number(report.summary.totalCredits) },
        { label: "Net Movement", value: Number(report.summary.netMovement) },
        { label: "Closing Balance", value: Number(report.closingBalance) },
      ]
    });
    return ReportExporter.getResponse(exportFormat, content, reportName);
  });
}
