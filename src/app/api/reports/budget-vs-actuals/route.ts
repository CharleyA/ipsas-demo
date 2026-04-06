import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const budgetId = searchParams.get("budgetId");
    const fiscalPeriodId = searchParams.get("fiscalPeriodId");
    const { organisationId } = session;

    // Find budget to use
    let budget: any = null;
    if (budgetId) {
      budget = await prisma.budget.findFirst({
        where: { id: budgetId, organisationId },
        include: {
          fiscalPeriod: true,
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
              fund: { select: { id: true, code: true, name: true } },
              costCentre: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    } else if (fiscalPeriodId) {
      // Find most recent approved/locked budget for the period
      budget = await prisma.budget.findFirst({
        where: {
          organisationId,
          fiscalPeriodId,
          status: { in: ["APPROVED", "LOCKED"] },
        },
        orderBy: { version: "desc" },
        include: {
          fiscalPeriod: true,
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
              fund: { select: { id: true, code: true, name: true } },
              costCentre: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    } else {
      // Use the most recent approved budget
      budget = await prisma.budget.findFirst({
        where: {
          organisationId,
          status: { in: ["APPROVED", "LOCKED"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          fiscalPeriod: true,
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
              fund: { select: { id: true, code: true, name: true } },
              costCentre: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    }

    if (!budget) {
      return NextResponse.json({ error: "No approved budget found. Please approve a budget first." }, { status: 404 });
    }

    const periodStart = budget.fiscalPeriod.startDate;
    const periodEnd = budget.fiscalPeriod.endDate;

    // Get actual GL entries for this period
    const glEntries = await prisma.gLEntry.findMany({
      where: {
        organisationId,
        date: { gte: periodStart, lte: periodEnd },
        header: { status: "POSTED" },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    // Aggregate actuals by account
    const actualsByAccount: Record<string, number> = {};
    glEntries.forEach((entry) => {
      const key = entry.accountId;
      const amount = entry.account.type === "EXPENSE" || entry.account.type === "ASSET"
        ? Number(entry.debit) - Number(entry.credit)
        : Number(entry.credit) - Number(entry.debit);
      actualsByAccount[key] = (actualsByAccount[key] || 0) + amount;
    });

    // Build comparison rows
    const rows = budget.lines.map((line: any) => {
      const actual = actualsByAccount[line.accountId] || 0;
      const budgeted = Number(line.amount);
      const variance = actual - budgeted;
      const variancePct = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

      return {
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        fund: line.fund?.name ?? "—",
        costCentre: line.costCentre?.name ?? "—",
        periodLabel: line.periodLabel,
        budgeted,
        actual,
        variance,
        variancePct,
        utilized: budgeted > 0 ? Math.min((actual / budgeted) * 100, 999) : 0,
      };
    });

    // Summary
    const totalBudgeted = rows.reduce((s: number, r: any) => s + r.budgeted, 0);
    const totalActual = rows.reduce((s: number, r: any) => s + r.actual, 0);
    const totalVariance = totalActual - totalBudgeted;

    // Chart data: budget vs actual by account type
    const byType: Record<string, { budgeted: number; actual: number }> = {};
    rows.forEach((r: any) => {
      if (!byType[r.accountType]) byType[r.accountType] = { budgeted: 0, actual: 0 };
      byType[r.accountType].budgeted += r.budgeted;
      byType[r.accountType].actual += r.actual;
    });
    const chartByType = Object.entries(byType).map(([type, v]) => ({
      name: type,
      budgeted: v.budgeted,
      actual: v.actual,
    }));

    // Top 10 over-budget lines
    const overBudget = rows
      .filter((r: any) => r.variance > 0)
      .sort((a: any, b: any) => b.variance - a.variance)
      .slice(0, 10)
      .map((r: any) => ({ name: r.accountName, variance: r.variance }));

    return NextResponse.json({
      budget: {
        id: budget.id,
        fiscalPeriod: budget.fiscalPeriod.name,
        status: budget.status,
        version: budget.version,
      },
      summary: { totalBudgeted, totalActual, totalVariance },
      rows,
      chartData: { byType: chartByType, overBudget },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
