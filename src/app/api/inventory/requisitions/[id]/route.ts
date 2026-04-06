import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const req_ = await prisma.stockRequisition.findUnique({
      where: { id },
      include: { lines: { include: { item: true } } },
    });
    if (!req_) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(req_);
  });
}
