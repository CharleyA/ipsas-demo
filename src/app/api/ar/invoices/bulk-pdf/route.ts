import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";
import { jsPDF } from "jspdf";

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json().catch(() => ({}));
      const invoiceIds = Array.isArray(body?.invoiceIds) ? body.invoiceIds.filter(Boolean) : [];
      const limit = Math.min(Math.max(Number(body?.limit || 100), 1), 500);
      const status = typeof body?.status === "string" ? body.status.toUpperCase() : undefined;

      const invoices = await prisma.aRInvoice.findMany({
        where: {
          organisationId: authReq.user.organisationId,
          ...(invoiceIds.length ? { id: { in: invoiceIds } } : {}),
          ...(status && status !== "ALL" ? { voucher: { status } } : {}),
        },
        include: {
          student: true,
          voucher: true,
        },
        orderBy: { createdAt: "asc" },
        take: invoiceIds.length ? undefined : limit,
      });

      if (invoices.length === 0) {
        return NextResponse.json({ error: "No invoices found for PDF export" }, { status: 404 });
      }

      const org = await prisma.organisation.findUnique({
        where: { id: authReq.user.organisationId },
      });

      const doc = new jsPDF({ unit: "mm", format: "a4" });

      invoices.forEach((invoice, index) => {
        if (index > 0) doc.addPage();
        let y = 15;
        const width = doc.internal.pageSize.getWidth();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(org?.name || "School Invoice", width / 2, y, { align: "center" });
        y += 8;
        doc.setFontSize(14);
        doc.text("Student Invoice", width / 2, y, { align: "center" });
        y += 10;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Invoice No: ${invoice.voucher?.number || invoice.id}`, 15, y);
        doc.text(`Date: ${invoice.voucher?.date ? new Date(invoice.voucher.date).toLocaleDateString("en-GB") : "-"}`, 120, y);
        y += 6;
        doc.text(`Student: ${invoice.student?.firstName || ""} ${invoice.student?.lastName || ""}`.trim(), 15, y);
        doc.text(`Student No: ${invoice.student?.studentNumber || "-"}`, 120, y);
        y += 6;
        doc.text(`Grade/Form: ${invoice.student?.grade || "-"}`, 15, y);
        doc.text(`Class: ${invoice.student?.class || "-"}`, 120, y);
        y += 6;
        doc.text(`Term: ${invoice.term || "-"}`, 15, y);
        doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "-"}`, 120, y);
        y += 12;

        doc.setFont("helvetica", "bold");
        doc.text(`Amount (${invoice.currencyCode}): ${money(invoice.amount)}`, 15, y);
        y += 7;
        doc.text(`Balance: ${money(invoice.balance)}`, 15, y);
        y += 7;
        doc.text(`Status: ${invoice.voucher?.status || invoice.status || "-"}`, 15, y);
      });

      const pdf = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="bulk-invoices.pdf"`,
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Bulk PDF export failed" }, { status: 500 });
    }
  }, ["ADMIN", "CLERK", "BURSAR"]);
}
