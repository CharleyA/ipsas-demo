import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "BURSAR"].includes(session.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    const { id } = await params;

    const existing = await prisma.budget.findFirst({
      where: { id, organisationId: session.organisationId },
    });
    if (!existing) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    if (existing.status !== "APPROVED") {
      return NextResponse.json({ error: "Only APPROVED budgets can be locked" }, { status: 400 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: { status: "LOCKED", lockedAt: new Date() },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
