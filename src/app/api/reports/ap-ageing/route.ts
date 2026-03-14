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
    const reportingCurrency = searchParams.get("currency") || undefined;
    const exportFormat = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getAPAgeing(authReq.user.organisationId, date, { reportingCurrency });

    if (exportFormat === "json") {
      return NextResponse.json(report);
    }

    const org = await prisma.organisation.findUnique({ 
      where: { id: authReq.user.organisationId } 
    });

    const columns: ExportColumn[] = [
      { header: "Supplier Name", key: "name", width: 30 },
      { header: "Total", key: "total" },
      { header: "Current", key: "current" },
      { header: "31-60 Days", key: "p30" },
      { header: "61-90 Days", key: "p60" },
      { header: "91-120 Days", key: "p90" },
      { header: "121+ Days", key: "p120" },
    ];

    const content = await ReportExporter.export(exportFormat, report.rows, columns, "Accounts Payable Ageing Report", {
      title: "Accounts Payable Ageing Report",
      subtitle: `As at ${format(date, "MMMM d, yyyy")}`,
      organisationName: org?.name || "Organisation",
      orientation: "landscape",
    });
    return ReportExporter.getResponse(exportFormat, content, "AP Ageing Report");
  });
}
