import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;
    const ppeLine = await prisma.statementLine.findUnique({
      where: { organisationId_reportType_code: { organisationId, reportType: "FINANCIAL_POSITION", code: "FP-PPE" } },
      include: { accountMaps: { include: { account: true } } }
    });

    const accountIds = ppeLine?.accountMaps.map(m => m.accountId) || [];
    const balances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId, entryDate: { lte: new Date("2025-12-31T23:59:59Z") } },
        accountId: { in: accountIds }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const assetAcq = await prisma.voucher.findMany({
      where: { organisationId, reference: { startsWith: "ASSET-ACQ-" } },
      include: { glHeader: { include: { entries: true } } },
      orderBy: { date: "asc" }
    });

    return NextResponse.json({
      ppeLine: ppeLine ? {
        code: ppeLine.code,
        name: ppeLine.name,
        maps: ppeLine.accountMaps.map(m => ({ accountCode: m.account.code, accountName: m.account.name, accountId: m.account.id }))
      } : null,
      balances: balances.map(b => ({ accountId: b.accountId, debitLc: b._sum.debitLc, creditLc: b._sum.creditLc })),
      assetAcquisitionVouchers: assetAcq.map(v => ({
        reference: v.reference,
        date: v.date,
        status: v.status,
        entries: v.glHeader?.entries.map(e => ({ accountId: e.accountId, debitLc: e.debitLc, creditLc: e.creditLc })) || []
      }))
    });
  } catch (error: any) {
    console.error("Trace FP PPE Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
