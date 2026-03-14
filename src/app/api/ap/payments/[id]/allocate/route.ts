import { NextRequest, NextResponse } from "next/server";
import { APService } from "@/lib/services/ap.service";
import { allocateAPPaymentSchema } from "@/lib/validations/schemas";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validatedData = allocateAPPaymentSchema.parse({
      ...body,
      paymentId: id,
    });

    const result = await APService.allocate(validatedData, session.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
