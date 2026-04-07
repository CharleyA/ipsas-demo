import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";
import { VoucherService } from "@/lib/services/voucher.service";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json().catch(() => ({}));
      const invoiceIds = Array.isArray(body?.invoiceIds) ? body.invoiceIds.filter(Boolean) : [];
      const statusFilter = typeof body?.status === "string" ? body.status.toUpperCase() : "APPROVED";
      const limit = Math.min(Math.max(Number(body?.limit || 0), 0), 2000);

      const where: any = {
        organisationId: authReq.user.organisationId,
        voucher: {},
      };

      if (invoiceIds.length > 0) {
        where.id = { in: invoiceIds };
      } else if (statusFilter && statusFilter !== "ALL") {
        where.voucher.status = statusFilter;
      }

      const invoices = await prisma.aRInvoice.findMany({
        where,
        include: {
          voucher: { select: { id: true, number: true, status: true } },
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
        orderBy: { createdAt: "asc" },
        take: limit || undefined,
      });

      const results: Array<{ invoiceId: string; voucherId: string; voucherNumber: string | null; status: string; ok: boolean; error?: string }> = [];

      for (const invoice of invoices) {
        const voucherId = invoice.voucherId;
        const voucherNumber = invoice.voucher?.number || null;
        try {
          const currentStatus = invoice.voucher?.status;

          if (currentStatus === "POSTED") {
            results.push({ invoiceId: invoice.id, voucherId, voucherNumber, status: currentStatus, ok: true });
            continue;
          }

          if (currentStatus === "DRAFT") {
            await VoucherService.submit(voucherId, authReq.user.userId);
          }

          const refreshed = await prisma.voucher.findUnique({ where: { id: voucherId }, select: { status: true } });
          if (refreshed?.status === "SUBMITTED") {
            await prisma.approvalTask.updateMany({
              where: { voucherId, userId: authReq.user.userId, status: "PENDING" },
              data: { status: "APPROVED" },
            });
            await prisma.voucher.update({ where: { id: voucherId }, data: { status: "APPROVED" } });
          }

          const approved = await prisma.voucher.findUnique({ where: { id: voucherId }, select: { status: true } });
          if (approved?.status === "APPROVED") {
            await VoucherService.post(voucherId, authReq.user.userId);
          }

          await prisma.aRInvoice.update({ where: { id: invoice.id }, data: { status: "POSTED" } });
          const finalVoucher = await prisma.voucher.findUnique({ where: { id: voucherId }, select: { status: true } });
          results.push({
            invoiceId: invoice.id,
            voucherId,
            voucherNumber,
            status: finalVoucher?.status || "UNKNOWN",
            ok: (finalVoucher?.status || "") === "POSTED",
          });
        } catch (error: any) {
          results.push({
            invoiceId: invoice.id,
            voucherId,
            voucherNumber,
            status: invoice.voucher?.status || "UNKNOWN",
            ok: false,
            error: error?.message || "Bulk post failed",
          });
        }
      }

      const postedCount = results.filter((r) => r.ok && r.status === "POSTED").length;
      const failedCount = results.filter((r) => !r.ok).length;

      return NextResponse.json({
        total: results.length,
        postedCount,
        failedCount,
        results,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Bulk post failed" }, { status: 500 });
    }
  }, ["ADMIN", "BURSAR"]);
}
