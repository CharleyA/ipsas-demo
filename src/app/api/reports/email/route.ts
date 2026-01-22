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

        // Generate Email Content with Summary
        let htmlBody = `<p>${message || `Please find attached the ${finalReportName} report.`}</p>`;
        
        if (reportName === "Trial Balance" && data.length > 0) {
          const totalDebit = data.reduce((sum, row) => sum + (parseFloat(row.debit) || 0), 0);
          const totalCredit = data.reduce((sum, row) => sum + (parseFloat(row.credit) || 0), 0);
          const variance = Math.abs(totalDebit - totalCredit);

          htmlBody += `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; font-family: sans-serif;">
              <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Executive Summary: Trial Balance</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total Debits:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${ReportExporter.formatCurrency(totalDebit)} ZWG</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total Credits:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${ReportExporter.formatCurrency(totalCredit)} ZWG</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 12px 0 0 0; color: #64748b; font-weight: bold;">Variance:</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; color: ${variance < 0.01 ? '#16a34a' : '#dc2626'};">
                    ${ReportExporter.formatCurrency(variance)} ZWG ${variance < 0.01 ? '(Balanced)' : '(Unbalanced)'}
                  </td>
                </tr>
              </table>
            </div>
          `;
        }

        if (reportName === "General Ledger" && data.length > 0) {
          // Calculate summary for email body
          const glData = await ReportService.getGeneralLedger(
            orgId,
            filters.accountId,
            new Date(filters.startDate),
            new Date(filters.endDate)
          );
          
          htmlBody += `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; font-family: sans-serif;">
              <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Financial Digest: ${glData.account.name}</h3>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 15px;">Period: ${format(new Date(filters.startDate), "MMM d, yyyy")} to ${format(new Date(filters.endDate), "MMM d, yyyy")}</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Opening Balance:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">${ReportExporter.formatCurrency(glData.openingBalance)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Total Debits (+):</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #16a34a;">${ReportExporter.formatCurrency(glData.summary.totalDebits)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Total Credits (-):</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #dc2626;">${ReportExporter.formatCurrency(glData.summary.totalCredits)}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0 0 0; color: #1e293b; font-weight: bold;">Closing Balance:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; font-weight: bold; color: #0f172a; font-size: 16px;">
                    ${ReportExporter.formatCurrency(glData.closingBalance)}
                  </td>
                </tr>
              </table>
            </div>
          `;
        }

        htmlBody += `
          <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            This institutional report was generated by <strong>${orgName}'s</strong> IPSAS Accounting System.<br>
            Security Notice: This email contains sensitive financial information.
          </p>
        `;

        await sendEmail({
          to,
          subject,
          text: message || `Please find attached the ${finalReportName} report.`,
          html: htmlBody,
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
