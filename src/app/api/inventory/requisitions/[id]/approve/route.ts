import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const existing = await prisma.stockRequisition.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (existing.status !== "SUBMITTED") {
        return NextResponse.json({ error: "Only SUBMITTED requisitions can be approved" }, { status: 400 });
      }
      const updated = await prisma.stockRequisition.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: authReq.user.userId,
          approvedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
