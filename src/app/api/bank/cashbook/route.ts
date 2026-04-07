import { NextRequest, NextResponse } from "next/server";
import { BankService } from "@/lib/services/bank.service";
import { createCashbookEntrySchema } from "@/lib/validations/schemas";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const entries = await BankService.listCashbookEntries(user.organisationId);
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = createCashbookEntrySchema.parse(body);

    const voucher = await BankService.createCashbookEntry(validated, user.userId);

    return NextResponse.json(voucher);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
