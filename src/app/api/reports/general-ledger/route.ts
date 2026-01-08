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
    const exportFormat = (searchParams.get("format") || "json") as ExportFormat;

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
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
      { header: "Balance", key: "balance" },
    ];

    const reportName = `General Ledger - ${report.account.name}`;
    const content = await ReportExporter.export(exportFormat, report.entries, columns, reportName, {
      title: "General Ledger",
      subtitle: `${report.account.code} - ${report.account.name} | ${format(startDate, "MMM d, yyyy")} to ${format(endDate, "MMM d, yyyy")}`,
      organisationName: org?.name || "Organisation",
      orientation: "landscape",
    });
    return ReportExporter.getResponse(exportFormat, content, reportName);
  });
}
