import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const orgId = authReq.user.organisationId;

    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, organisationId: orgId } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // Bills in period
    const bills = await prisma.aPBill.findMany({
      where: {
        organisationId: orgId,
        supplierId,
        voucher: { status: "POSTED" },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { voucher: { select: { number: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Payments in period
    const payments = await prisma.aPPayment.findMany({
      where: {
        organisationId: orgId,
        supplierId,
        voucher: { status: "POSTED" },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { voucher: { select: { number: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Opening balance: bills posted before startDate still with balance
    const openingBills = await prisma.aPBill.aggregate({
      where: {
        organisationId: orgId,
        supplierId,
        voucher: { status: "POSTED" },
        createdAt: { lt: startDate },
        balance: { gt: 0 },
      },
      _sum: { balance: true },
    });
    const openingBalance = Number(openingBills._sum.balance ?? 0);

    // Build running statement
    type StatementLine = {
      date: Date; type: "BILL" | "PAYMENT"; reference: string;
      amount: number; debit: number; credit: number; balance: number;
      currencyCode: string;
    };

    const lines: StatementLine[] = [];
    let runningBalance = openingBalance;

    const allEvents = [
      ...bills.map((b) => ({ date: b.createdAt, type: "BILL" as const, ref: b.voucher.number, amount: Number(b.amount), currency: b.currencyCode })),
      ...payments.map((p) => ({ date: p.createdAt, type: "PAYMENT" as const, ref: p.voucher.number, amount: Number(p.amount), currency: p.currencyCode })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const ev of allEvents) {
      if (ev.type === "BILL") {
        runningBalance += ev.amount;
        lines.push({ date: ev.date, type: "BILL", reference: ev.ref, amount: ev.amount, debit: ev.amount, credit: 0, balance: runningBalance, currencyCode: ev.currency });
      } else {
        runningBalance -= ev.amount;
        lines.push({ date: ev.date, type: "PAYMENT", reference: ev.ref, amount: ev.amount, debit: 0, credit: ev.amount, balance: runningBalance, currencyCode: ev.currency });
      }
    }

    const totalBilled = bills.reduce((s, b) => s + Number(b.amount), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const closingBalance = openingBalance + totalBilled - totalPaid;

    return NextResponse.json({
      supplier,
      startDate,
      endDate,
      openingBalance,
      closingBalance,
      totalBilled,
      totalPaid,
      lines,
    });
  });
}
