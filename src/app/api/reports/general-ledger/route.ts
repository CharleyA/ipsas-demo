import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const accountId = searchParams.get("accountId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const format = (searchParams.get("format") || "json") as ExportFormat;

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

    if (format === "json") {
      return NextResponse.json(report);
    }

    const columns: ExportColumn[] = [
      { header: "Date", key: "date" },
      { header: "Entry #", key: "entryNumber" },
      { header: "Voucher #", key: "voucherNumber" },
      { header: "Description", key: "description", width: 40 },
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
      { header: "Balance", key: "balance" },
    ];

    const content = await ReportExporter.export(
      format,
      report.entries,
      columns,
      `General Ledger - ${report.account.name}`
    );
    return ReportExporter.getResponse(format, content, `General Ledger - ${report.account.name}`);
  });
}
