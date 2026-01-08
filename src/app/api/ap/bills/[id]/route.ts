import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bill = await prisma.aPBill.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        voucher: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        },
        lines: true,
      }
    });

    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    return NextResponse.json(bill);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
