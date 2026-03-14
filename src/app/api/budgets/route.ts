import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const organisationId = searchParams.get("organisationId") || session.organisationId;
    if (!organisationId) return NextResponse.json({ error: "Organisation ID required" }, { status: 400 });

    const budgets = await prisma.budget.findMany({
      where: { organisationId },
      include: { fiscalPeriod: true, lines: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fiscalPeriodId, notes, lines = [] } = body || {};

    if (!fiscalPeriodId) return NextResponse.json({ error: "fiscalPeriodId is required" }, { status: 400 });

    const budget = await prisma.budget.create({
      data: {
        organisationId: session.organisationId,
        fiscalPeriodId,
        status: "DRAFT",
        version: 1,
        notes,
        createdById: session.userId,
        lines: {
          create: lines.map((line: any) => ({
            fundId: line.fundId,
            costCentreId: line.costCentreId,
            accountId: line.accountId,
            periodLabel: line.periodLabel ?? null,
            amount: line.amount,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
