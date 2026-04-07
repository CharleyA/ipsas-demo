import { NextRequest, NextResponse } from "next/server";
import { BankService } from "@/lib/services/bank.service";
import { matchBankRowSchema } from "@/lib/validations/schemas";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = matchBankRowSchema.parse(body);

    const result = await BankService.matchRow(
      validated.rowId,
      validated.voucherId,
      user.userId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
