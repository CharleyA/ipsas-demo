import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json().catch(() => ({}));
      const existing = await prisma.stockRequisition.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (!["SUBMITTED", "APPROVED"].includes(existing.status)) {
        return NextResponse.json({ error: "Cannot reject at this stage" }, { status: 400 });
      }
      const updated = await prisma.stockRequisition.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedById: authReq.user.userId,
          rejectedAt: new Date(),
          rejectionNote: body.reason || null,
        },
      });
      return NextResponse.json(updated);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
