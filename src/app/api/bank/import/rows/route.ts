import { NextRequest, NextResponse } from "next/server";
import { BankService } from "@/lib/services/bank.service";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get("bankAccountId");

    if (!bankAccountId) {
      return NextResponse.json({ error: "bankAccountId is required" }, { status: 400 });
    }

    const rows = await BankService.getUnmatchedRows(bankAccountId);

    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
