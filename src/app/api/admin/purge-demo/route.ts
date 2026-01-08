import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuth, enforceRole } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";

const CONFIRM_STRING = "I_UNDERSTAND_THIS_DELETES_DATA";

export async function POST(req: NextRequest) {
  try {
    const authContext = await verifyAuth(req);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN role can run it
    if (authContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const { confirm, purgeStudents, purgeSuppliers, purgeMasterData } = body;

    if (confirm !== CONFIRM_STRING) {
      return NextResponse.json({ error: "Invalid confirmation string" }, { status: 400 });
    }

    // Safety: allowed only when NODE_ENV !== "production" OR ALLOW_PURGE=true
    const isProduction = process.env.NODE_ENV === "production";
    const allowPurge = process.env.ALLOW_PURGE === "true";

    if (isProduction && !allowPurge) {
      return NextResponse.json(
        { error: "Purge is disabled in production unless ALLOW_PURGE=true" },
        { status: 403 }
      );
    }

    const organisationId = authContext.organisationId;

    // Perform deletes inside a DB transaction
    const result = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};

      // Order matters to avoid foreign key violations
      
      // 1. AR Allocations
      const arAlloc = await tx.aRAllocation.deleteMany({
        where: { invoice: { organisationId } }
      });
      counts.arAllocations = arAlloc.count;

      // 2. AR Invoice Lines
      const arInvLines = await tx.aRInvoiceLine.deleteMany({
        where: { invoice: { organisationId } }
      });
      counts.arInvoiceLines = arInvLines.count;

      // 3. AR Invoices
      const arInvoices = await tx.aRInvoice.deleteMany({
        where: { organisationId }
      });
      counts.arInvoices = arInvoices.count;

      // 4. AR Receipts
      const arReceipts = await tx.aRReceipt.deleteMany({
        where: { organisationId }
      });
      counts.arReceipts = arReceipts.count;

      // 5. AP Allocations
      const apAlloc = await tx.aPAllocation.deleteMany({
        where: { bill: { organisationId } }
      });
      counts.apAllocations = apAlloc.count;

      // 6. AP Bill Lines
      const apBillLines = await tx.aPBillLine.deleteMany({
        where: { bill: { organisationId } }
      });
      counts.apBillLines = apBillLines.count;

      // 7. AP Bills
      const apBills = await tx.aPBill.deleteMany({
        where: { organisationId }
      });
      counts.apBills = apBills.count;

      // 8. AP Payments
      const apPayments = await tx.aPPayment.deleteMany({
        where: { organisationId }
      });
      counts.apPayments = apPayments.count;

      // 9. GL Entries
      const glEntries = await tx.gLEntry.deleteMany({
        where: { glHeader: { organisationId } }
      });
      counts.glEntries = glEntries.count;

      // 10. GL Headers
      const glHeaders = await tx.gLHeader.deleteMany({
        where: { organisationId }
      });
      counts.glHeaders = glHeaders.count;

      // 11. Approval Tasks
      const approvalTasks = await tx.approvalTask.deleteMany({
        where: { voucher: { organisationId } }
      });
      counts.approvalTasks = approvalTasks.count;

      // 12. Voucher Attachments
      const voucherAttachments = await tx.voucherAttachment.deleteMany({
        where: { voucher: { organisationId } }
      });
      counts.voucherAttachments = voucherAttachments.count;

      // 13. Voucher Lines
      const voucherLines = await tx.voucherLine.deleteMany({
        where: { voucher: { organisationId } }
      });
      counts.voucherLines = voucherLines.count;

      // 14. Vouchers
      const vouchers = await tx.voucher.deleteMany({
        where: { organisationId }
      });
      counts.vouchers = vouchers.count;

      // 15. Bank Statement Rows
      const bankRows = await tx.bankStatementRow.deleteMany({
        where: { import: { bankAccount: { organisationId } } }
      });
      counts.bankStatementRows = bankRows.count;

      // 16. Bank Statement Imports
      const bankImports = await tx.bankStatementImport.deleteMany({
        where: { bankAccount: { organisationId } }
      });
      counts.bankStatementImports = bankImports.count;

      // Optional: Students
      if (purgeStudents || purgeMasterData) {
        const students = await tx.student.deleteMany({
          where: { organisationId }
        });
        counts.students = students.count;
      }

      // Optional: Suppliers
      if (purgeSuppliers || purgeMasterData) {
        const suppliers = await tx.supplier.deleteMany({
          where: { organisationId }
        });
        counts.suppliers = suppliers.count;
      }

      // 17. Audit Logs (transactional)
      const auditLogs = await tx.auditLog.deleteMany({
        where: { 
          organisationId,
          entityType: {
            in: [
              'Voucher', 'VoucherLine', 'GLHeader', 'GLEntry', 
              'ARInvoice', 'ARReceipt', 'APBill', 'APPayment',
              'BankStatementImport', 'BankStatementRow', 'ApprovalTask'
            ]
          }
        }
      });
      counts.auditLogs = auditLogs.count;

      return counts;
    });

    // Log the purge action
    await AuditService.log({
      userId: authContext.userId,
      organisationId: authContext.organisationId,
      action: "PURGE_DEMO_DATA",
      entityType: "Organisation",
      entityId: organisationId,
      newValues: { purgeResult: result, body }
    });

    return NextResponse.json({ 
      message: "Data purged successfully", 
      counts: result 
    });

  } catch (error: any) {
    console.error("Purge Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
