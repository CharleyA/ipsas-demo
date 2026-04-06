import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const orgId = authReq.user.organisationId;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const student = await prisma.student.findFirst({ where: { id: studentId, organisationId: orgId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const invoices = await prisma.aRInvoice.findMany({
      where: {
        organisationId: orgId,
        studentId,
        voucher: { status: "POSTED" },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        voucher: { select: { number: true, createdAt: true } },
        lines: { select: { description: true, amount: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const receipts = await prisma.aRReceipt.findMany({
      where: {
        organisationId: orgId,
        studentId,
        voucher: { status: "POSTED" },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { voucher: { select: { number: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Opening balance
    const openingInv = await prisma.aRInvoice.aggregate({
      where: {
        organisationId: orgId,
        studentId,
        voucher: { status: "POSTED" },
        createdAt: { lt: startDate },
        balance: { gt: 0 },
      },
      _sum: { balance: true },
    });
    const openingBalance = Number(openingInv._sum.balance ?? 0);

    type StatementLine = {
      date: Date; type: "INVOICE" | "RECEIPT"; reference: string;
      description: string; debit: number; credit: number; balance: number;
      currencyCode: string; term: string | null;
    };

    const lines: StatementLine[] = [];
    let runningBalance = openingBalance;

    const allEvents = [
      ...invoices.map((inv) => ({
        date: inv.createdAt,
        type: "INVOICE" as const,
        ref: inv.voucher.number,
        desc: inv.lines.map((l) => l.description).join(", ") || "Invoice",
        amount: Number(inv.amount),
        currency: inv.currencyCode,
        term: inv.term ?? null,
      })),
      ...receipts.map((r) => ({
        date: r.createdAt,
        type: "RECEIPT" as const,
        ref: r.voucher.number,
        desc: "Receipt",
        amount: Number(r.amount),
        currency: r.currencyCode,
        term: null,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const ev of allEvents) {
      if (ev.type === "INVOICE") {
        runningBalance += ev.amount;
        lines.push({ date: ev.date, type: "INVOICE", reference: ev.ref, description: ev.desc, debit: ev.amount, credit: 0, balance: runningBalance, currencyCode: ev.currency, term: ev.term });
      } else {
        runningBalance -= ev.amount;
        lines.push({ date: ev.date, type: "RECEIPT", reference: ev.ref, description: ev.desc, debit: 0, credit: ev.amount, balance: runningBalance, currencyCode: ev.currency, term: null });
      }
    }

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalReceived = receipts.reduce((s, r) => s + Number(r.amount), 0);
    const closingBalance = openingBalance + totalInvoiced - totalReceived;

    return NextResponse.json({
      student,
      startDate,
      endDate,
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalReceived,
      lines,
    });
  });
}
