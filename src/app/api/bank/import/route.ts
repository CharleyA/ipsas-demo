import { NextRequest, NextResponse } from "next/server";
import { BankService } from "@/lib/services/bank.service";
import { createBankImportSchema } from "@/lib/validations/schemas";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = createBankImportSchema.parse(body);

    const bankImport = await BankService.importStatement(
      validated.bankAccountId,
      validated.filename,
      validated.rows.map(r => ({ ...r, date: new Date(r.date) })),
      user.userId
    );

    return NextResponse.json(bankImport);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
