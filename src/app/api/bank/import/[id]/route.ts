import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const bankImport = await prisma.bankStatementImport.findUnique({
      where: { id },
      include: {
        rows: {
          orderBy: { date: "asc" }
        },
        bankAccount: true
      }
    });

    if (!bankImport) {
      return NextResponse.json({ error: "Bank import not found" }, { status: 404 });
    }

    return NextResponse.json(bankImport);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
