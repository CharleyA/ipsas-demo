import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  return withAuth(req, async (authReq) => {
    const { supplierId } = await params;
    const orgId = authReq.user.organisationId;

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, organisationId: orgId } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // All posted bills
    const bills = await prisma.aPBill.findMany({
      where: { organisationId: orgId, supplierId, voucher: { status: "POSTED" } },
      include: {
        voucher: { select: { number: true, createdAt: true } },
        allocations: { select: { amount: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // All posted payments
    const payments = await prisma.aPPayment.findMany({
      where: { organisationId: orgId, supplierId, voucher: { status: "POSTED" } },
      include: { voucher: { select: { number: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Build running-balance transactions list
    type Txn = {
      date: Date; type: "BILL" | "PAYMENT";
      billNumber?: string; reference?: string; description?: string;
      amount: number; amountPaid?: number; balance: number; status?: string;
    };

    const txns: Txn[] = [];
    let running = 0;

    const events = [
      ...bills.map((b) => ({
        date: b.createdAt, type: "BILL" as const,
        ref: b.voucher.number, amount: Number(b.amount),
        amountPaid: b.allocations.reduce((s, a) => s + Number(a.amount), 0),
        balance: Number(b.balance),
      })),
      ...payments.map((p) => ({
        date: p.createdAt, type: "PAYMENT" as const,
        ref: p.voucher.number, amount: Number(p.amount),
        amountPaid: undefined,
        balance: undefined as number | undefined,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const ev of events) {
      running = ev.type === "BILL" ? running + ev.amount : running - ev.amount;
      txns.push({
        date: ev.date,
        type: ev.type,
        billNumber: ev.ref,
        reference: ev.ref,
        description: ev.type === "BILL" ? "Supplier bill" : "Payment",
        amount: ev.amount,
        amountPaid: ev.amountPaid,
        balance: running,
        status: "POSTED",
      });
    }

    const totalInvoiced = bills.reduce((s, b) => s + Number(b.amount), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstandingBalance = bills.reduce((s, b) => s + Number(b.balance), 0);

    return NextResponse.json({
      supplier,
      transactions: txns,
      totalBills: bills.length,
      totalInvoiced,
      totalPaid,
      outstandingBalance,
    });
  });
}
