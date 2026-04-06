import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    const { organisationId } = session;

    // Get all GL entries for expense accounts in period
    const glEntries = await prisma.gLEntry.findMany({
      where: {
        organisationId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        header: { status: "POSTED" },
        account: { type: "EXPENSE" },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
        costCentre: { select: { id: true, code: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        header: { select: { id: true, status: true } },
      },
    });

    // Group by cost centre → account
    const byCostCentre: Record<string, {
      costCentreName: string;
      costCentreCode: string;
      total: number;
      accounts: Record<string, { name: string; code: string; amount: number }>;
    }> = {};

    glEntries.forEach((entry) => {
      const ccId = entry.costCentreId || "UNALLOCATED";
      const ccName = entry.costCentre?.name ?? "Unallocated";
      const ccCode = entry.costCentre?.code ?? "—";

      if (!byCostCentre[ccId]) {
        byCostCentre[ccId] = { costCentreName: ccName, costCentreCode: ccCode, total: 0, accounts: {} };
      }

      const amount = Number(entry.debit) - Number(entry.credit);
      byCostCentre[ccId].total += amount;

      const accId = entry.accountId;
      if (!byCostCentre[ccId].accounts[accId]) {
        byCostCentre[ccId].accounts[accId] = {
          name: entry.account.name,
          code: entry.account.code,
          amount: 0,
        };
      }
      byCostCentre[ccId].accounts[accId].amount += amount;
    });

    // Flatten for response
    const departments = Object.entries(byCostCentre).map(([ccId, dept]) => ({
      costCentreId: ccId,
      costCentreCode: dept.costCentreCode,
      costCentreName: dept.costCentreName,
      total: dept.total,
      accounts: Object.entries(dept.accounts)
        .map(([id, a]) => ({ id, code: a.code, name: a.name, amount: a.amount }))
        .sort((a, b) => b.amount - a.amount),
    })).sort((a, b) => b.total - a.total);

    const grandTotal = departments.reduce((s, d) => s + d.total, 0);

    // Chart: top 8 departments
    const chartData = departments.slice(0, 8).map((d) => ({
      name: d.costCentreName.length > 18 ? d.costCentreName.slice(0, 18) + "…" : d.costCentreName,
      amount: d.total,
    }));

    return NextResponse.json({
      startDate,
      endDate,
      grandTotal,
      departments,
      chartData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
