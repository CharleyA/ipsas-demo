import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  return withAuth(
    req,
    async (authReq) => {
      const body = await authReq.json();
      const { reportName, filters, format, to, subject, message } = body;

      if (!reportName || !format || !to || !subject) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // 1. Fetch data based on reportName
      let data: any[] = [];
      let columns: ExportColumn[] = [];
      let finalReportName = reportName;

      const orgId = authReq.user.organisationId;

      switch (reportName) {
        case "Trial Balance":
          const tb = await ReportService.getTrialBalance(orgId, new Date(filters.date || new Date()));
          data = tb.rows;
          columns = [
            { header: "Code", key: "code" },
            { header: "Account Name", key: "name", width: 30 },
            { header: "Type", key: "type" },
            { header: "Debit", key: "debit" },
            { header: "Credit", key: "credit" },
            { header: "Net Balance", key: "balance" },
          ];
          break;
        case "General Ledger":
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
          break;
        case "Financial Position":
          const fp = await ReportService.getFinancialPosition(orgId, new Date(filters.date || new Date()));
          data = flattenRecursive(fp.rows);
          columns = [
            { header: "Code", key: "code" },
            { header: "Line Name", key: "name", width: 40 },
            { header: "Amount", key: "amount" },
          ];
          break;
        case "Financial Performance":
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
          break;
        case "Cash Flow":
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
          break;
        case "AR Ageing":
          const ar = await ReportService.getARAgeing(orgId, new Date(filters.date || new Date()));
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
          break;
        case "AP Ageing":
          const ap = await ReportService.getAPAgeing(orgId, new Date(filters.date || new Date()));
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
          break;
        default:
          return NextResponse.json({ error: "Invalid report name" }, { status: 400 });
      }

      // 2. Generate file
      const content = await ReportExporter.export(format as ExportFormat, data, columns, finalReportName);
      
      // 3. Send email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const extension = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      const contentType = format === "xlsx" 
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : format === "pdf" ? "application/pdf" : "text/csv";

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text: message,
        attachments: [
          {
            filename: `${finalReportName.replace(/\s+/g, "_")}.${extension}`,
            content: content as Buffer,
            contentType,
          },
        ],
      });

      return NextResponse.json({ success: true });
    },
    ["AUDITOR", "HEADMASTER", "ADMIN"]
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
