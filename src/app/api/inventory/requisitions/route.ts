import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { prisma } from "@/lib/prisma";

async function generateReqNumber(organisationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.stockRequisition.count({
    where: { organisationId, reqNumber: { startsWith: `REQ-${year}-` } },
  });
  return `REQ-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const reqs = await prisma.stockRequisition.findMany({
      where: {
        organisationId: authReq.user.organisationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reqs);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const reqNumber = await generateReqNumber(authReq.user.organisationId);
      const requisition = await prisma.stockRequisition.create({
        data: {
          organisationId: authReq.user.organisationId,
          reqNumber,
          requestedById: authReq.user.userId,
          department: body.department || null,
          requestDate: new Date(body.requestDate || new Date()),
          requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
          notes: body.notes || null,
          status: "SUBMITTED",
          lines: {
            create: (body.lines || []).map((l: any) => ({
              itemId: l.itemId,
              qtyRequested: l.qtyRequested,
              notes: l.notes || null,
            })),
          },
        },
        include: { lines: { include: { item: true } } },
      });
      return NextResponse.json(requisition);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
