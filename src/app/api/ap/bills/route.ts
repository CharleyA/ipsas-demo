import { NextRequest, NextResponse } from "next/server";
import { APService } from "@/lib/services/ap.service";
import { createAPBillSchema } from "@/lib/validations/schemas";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validatedData = createAPBillSchema.parse(body);

    const bill = await APService.createBill(validatedData, session.userId);
    return NextResponse.json(bill);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const organisationId = searchParams.get("organisationId") || session.organisationId;
    if (!organisationId) return NextResponse.json({ error: "Organisation ID required" }, { status: 400 });

    const bills = await prisma.aPBill.findMany({
      where: { organisationId },
      include: {
        supplier: true,
        voucher: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bills);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
