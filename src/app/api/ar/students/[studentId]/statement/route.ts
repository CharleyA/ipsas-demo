import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  return withAuth(req, async (authReq) => {
    const { studentId } = await params;
    const orgId = authReq.user.organisationId;

    const student = await prisma.student.findFirst({ where: { id: studentId, organisationId: orgId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // All posted invoices
    const invoices = await prisma.aRInvoice.findMany({
      where: { organisationId: orgId, studentId, voucher: { status: "POSTED" } },
      include: {
        voucher: { select: { number: true, createdAt: true } },
        lines: { select: { description: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // All posted receipts
    const receipts = await prisma.aRReceipt.findMany({
      where: { organisationId: orgId, studentId, voucher: { status: "POSTED" } },
      include: { voucher: { select: { number: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Build running transactions
    type Txn = {
      date: Date; type: "INVOICE" | "RECEIPT";
      invoiceNumber?: string; receiptNumber?: string; reference?: string;
      term?: string | null; description?: string;
      amount: number; balance: number; status?: string;
    };

    const txns: Txn[] = [];
    let running = 0;

    const events = [
      ...invoices.map((inv) => ({
        date: inv.createdAt, type: "INVOICE" as const,
        ref: inv.voucher.number, amount: Number(inv.amount),
        term: inv.term,
        description: inv.lines.map((l) => l.description).join(", ") || "Fee Invoice",
      })),
      ...receipts.map((r) => ({
        date: r.createdAt, type: "RECEIPT" as const,
        ref: r.voucher.number, amount: Number(r.amount),
        term: null, description: "Receipt",
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const ev of events) {
      running = ev.type === "INVOICE" ? running + ev.amount : running - ev.amount;
      txns.push({
        date: ev.date,
        type: ev.type,
        invoiceNumber: ev.type === "INVOICE" ? ev.ref : undefined,
        receiptNumber: ev.type === "RECEIPT" ? ev.ref : undefined,
        reference: ev.ref,
        term: ev.term,
        description: ev.description,
        amount: ev.amount,
        balance: running,
        status: "POSTED",
      });
    }

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalRecepted = receipts.reduce((s, r) => s + Number(r.amount), 0);
    const balance = invoices.reduce((s, i) => s + Number(i.balance), 0);

    return NextResponse.json({
      student,
      transactions: txns,
      invoices: txns, // alias for pages that use statement.invoices
      invoiceCount: invoices.length,
      totalInvoiced,
      totalRecepted,
      totalPaid: totalRecepted,
      balance,
    });
  });
}
