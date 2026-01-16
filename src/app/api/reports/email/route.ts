import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";
import { sendEmail } from "@/lib/email";
import { AuditService } from "@/lib/services/audit.service";
import prisma from "@/lib/db";
import { format } from "date-fns";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withAuth(
    req,
    async (authReq) => {
      const body = await authReq.json();
      const { reportName, filters, format: exportFormat, to, subject, message } = body;

      if (!reportName || !exportFormat || !to || !subject) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      let data: any[] = [];
      let columns: ExportColumn[] = [];
      let finalReportName = reportName;
      let subtitle = "";
      let orientation: 'portrait' | 'landscape' = 'portrait';

      const orgId = authReq.user.organisationId;
      const org = await prisma.organisation.findUnique({ where: { id: orgId } });
      const orgName = org?.name || "Organisation";

      try {
        switch (reportName) {
          case "Trial Balance":
            const date = filters?.date ? new Date(filters.date) : new Date();
            const tb = await ReportService.getTrialBalance(orgId, date);
            data = tb.rows;
            columns = [
              { header: "Code", key: "code" },
              { header: "Account Name", key: "name", width: 30 },
              { header: "Type", key: "type" },
              { header: "Debit", key: "debit" },
              { header: "Credit", key: "credit" },
              { header: "Net Balance", key: "balance" },
            ];
            subtitle = `As at ${format(date, "MMMM d, yyyy")}`;
            break;

          case "General Ledger":
            if (!filters?.accountId || !filters?.startDate || !filters?.endDate) {
              return NextResponse.json({ error: "Missing account or date filters" }, { status: 400 });
            }
            const gl = await ReportService.getGeneralLedger(
              orgId,
              filters.accountId,
              new Date(filters.startDate),
              new Date(filters.endDate)
            );
            data = gl.entries;
            columns = [
              { header: "Date", key: "date" },
              { header: "Entry #", key: "entryNumber" },
              { header: "Voucher #", key: "voucherNumber" },
              { header: "Description", key: "description", width: 40 },
              { header: "Debit", key: "debit" },
              { header: "Credit", key: "credit" },
              { header: "Balance", key: "balance" },
            ];
            finalReportName = `General Ledger - ${gl.account.name}`;
            subtitle = `${gl.account.code} - ${gl.account.name} | ${format(new Date(filters.startDate), "MMM d, yyyy")} to ${format(new Date(filters.endDate), "MMM d, yyyy")}`;
            orientation = 'landscape';
            break;

          case "Financial Position":
            const fpDate = filters?.date ? new Date(filters.date) : new Date();
            const fp = await ReportService.getFinancialPosition(orgId, fpDate);
            data = flattenRecursive(fp.rows);
            columns = [
              { header: "Code", key: "code" },
              { header: "Line Name", key: "name", width: 40 },
              { header: "Amount", key: "amount" },
            ];
            subtitle = `As at ${format(fpDate, "MMMM d, yyyy")}`;
            break;

          case "Financial Performance":
            if (!filters?.startDate || !filters?.endDate) {
              return NextResponse.json({ error: "Missing date range" }, { status: 400 });
            }
            const perf = await ReportService.getFinancialPerformance(
              orgId,
              new Date(filters.startDate),
              new Date(filters.endDate)
            );
            data = flattenRecursive(perf.rows);
            columns = [
              { header: "Code", key: "code" },
              { header: "Line Name", key: "name", width: 40 },
              { header: "Amount", key: "amount" },
            ];
            subtitle = `For the period ${format(new Date(filters.startDate), "MMM d, yyyy")} to ${format(new Date(filters.endDate), "MMM d, yyyy")}`;
            break;

          case "Cash Flow":
            if (!filters?.startDate || !filters?.endDate) {
              return NextResponse.json({ error: "Missing date range" }, { status: 400 });
            }
            const cf = await ReportService.getCashflow(
              orgId,
              new Date(filters.startDate),
              new Date(filters.endDate)
            );
            data = flattenRecursive(cf.rows);
            columns = [
              { header: "Code", key: "code" },
              { header: "Line Name", key: "name", width: 40 },
              { header: "Amount", key: "amount" },
            ];
            subtitle = `For the period ${format(new Date(filters.startDate), "MMM d, yyyy")} to ${format(new Date(filters.endDate), "MMM d, yyyy")}`;
            break;

          case "AR Ageing":
            const arDate = filters?.date ? new Date(filters.date) : new Date();
            const ar = await ReportService.getARAgeing(orgId, arDate);
            data = ar.rows;
            columns = [
              { header: "Student Name", key: "name", width: 30 },
              { header: "Total", key: "total" },
              { header: "Current", key: "current" },
              { header: "31-60 Days", key: "p30" },
              { header: "61-90 Days", key: "p60" },
              { header: "91-120 Days", key: "p90" },
              { header: "121+ Days", key: "p120" },
            ];
            subtitle = `As at ${format(arDate, "MMMM d, yyyy")}`;
            orientation = 'landscape';
            break;

          case "AP Ageing":
            const apDate = filters?.date ? new Date(filters.date) : new Date();
            const ap = await ReportService.getAPAgeing(orgId, apDate);
            data = ap.rows;
            columns = [
              { header: "Supplier Name", key: "name", width: 30 },
              { header: "Total", key: "total" },
              { header: "Current", key: "current" },
              { header: "31-60 Days", key: "p30" },
              { header: "61-90 Days", key: "p60" },
              { header: "91-120 Days", key: "p90" },
              { header: "121+ Days", key: "p120" },
            ];
            subtitle = `As at ${format(apDate, "MMMM d, yyyy")}`;
            orientation = 'landscape';
            break;

          default:
            return NextResponse.json({ error: "Invalid report name" }, { status: 400 });
        }

        const content = await ReportExporter.export(
          exportFormat as ExportFormat, 
          data, 
          columns, 
          finalReportName,
          {
            title: finalReportName,
            subtitle,
            organisationName: orgName,
            orientation,
          }
        );
        
        const extension = exportFormat === "xlsx" ? "xlsx" : exportFormat === "pdf" ? "pdf" : "csv";
        const contentType = exportFormat === "xlsx" 
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : exportFormat === "pdf" ? "application/pdf" : "text/csv";

        await sendEmail({
          to,
          subject,
          text: message || `Please find attached the ${finalReportName} report.`,
          html: `
            <p>${message || `Please find attached the ${finalReportName} report.`}</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This report was generated by ${orgName}'s IPSAS Accounting System.
            </p>
          `,
          attachments: [
            {
              filename: `${finalReportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.${extension}`,
              content: content as Buffer,
              contentType,
            },
          ],
        });

        await AuditService.log({
          organisationId: orgId,
          userId: authReq.user.userId,
          action: "EMAIL_REPORT",
          entityType: "Report",
          entityId: reportName,
          newValues: { to, subject, format: exportFormat, filters },
        });

        return NextResponse.json({ success: true, message: `Report sent to ${to}` });
      } catch (error: any) {
        console.error("Email report error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    },
    ["AUDITOR", "HEADMASTER", "ADMIN", "BURSAR"]
  );
}

function flattenRecursive(rows: any[], level = 0): any[] {
  const result: any[] = [];
  rows.forEach((row) => {
    result.push({
      code: row.code,
      name: "  ".repeat(level) + row.name,
      amount: row.amount,
    });
    if (row.children && row.children.length > 0) {
      result.push(...flattenRecursive(row.children, level + 1));
    }
  });
  return result;
}
