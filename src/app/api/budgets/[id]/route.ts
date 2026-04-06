import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const budget = await prisma.budget.findFirst({
      where: { id, organisationId: session.organisationId },
      include: {
        fiscalPeriod: true,
        createdBy: { select: { firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
            fund: { select: { id: true, code: true, name: true } },
            costCentre: { select: { id: true, code: true, name: true } },
          },
          orderBy: { account: { code: "asc" } },
        },
      },
    });

    if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { notes, lines } = body;

    const existing = await prisma.budget.findFirst({
      where: { id, organisationId: session.organisationId },
    });
    if (!existing) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    if (existing.status === "LOCKED" || existing.status === "APPROVED") {
      return NextResponse.json({ error: "Cannot edit an approved or locked budget" }, { status: 400 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        notes,
        ...(lines !== undefined && {
          lines: {
            deleteMany: {},
            create: lines.map((l: any) => ({
              fundId: l.fundId,
              costCentreId: l.costCentreId,
              accountId: l.accountId,
              periodLabel: l.periodLabel ?? null,
              amount: l.amount,
            })),
          },
        }),
      },
      include: { lines: true },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.budget.findFirst({
      where: { id, organisationId: session.organisationId },
    });
    if (!existing) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT budgets can be deleted" }, { status: 400 });
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
