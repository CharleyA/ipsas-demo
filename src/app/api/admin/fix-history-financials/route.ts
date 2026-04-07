import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;

    const ppe = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "1210" } } });
    const accum = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "1600" } } });
    const equity = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "3100" } } });
    if (!ppe || !accum || !equity) {
      return NextResponse.json({ error: "Required accounts missing (1210, 1600, 3100)" }, { status: 400 });
    }

    // Repoint historical depreciation credits from PPE(1210) to accumulated depreciation(1600)
    const depEntries = await prisma.gLEntry.findMany({
      where: {
        glHeader: {
          organisationId,
          voucher: {
            description: { startsWith: "Historical depreciation " }
          }
        },
        accountId: ppe.id,
        creditLc: { gt: 0 }
      },
      select: { id: true }
    });

    let repointed = 0;
    for (const entry of depEntries) {
      await prisma.gLEntry.update({ where: { id: entry.id }, data: { accountId: accum.id } });
      repointed++;
    }

    // Seed balancing equity journal if equity still has no posted balance.
    const equityAgg = await prisma.gLEntry.aggregate({
      where: {
        glHeader: { organisationId },
        accountId: equity.id,
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const equityBalance = Number(equityAgg._sum.debitLc || 0) - Number(equityAgg._sum.creditLc || 0);

    return NextResponse.json({
      message: "Historical financial corrections applied",
      summary: {
        depreciationEntriesRepointed: repointed,
        equityCurrentBalance: equityBalance
      }
    });
  } catch (error: any) {
    console.error("Fix History Financials Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
