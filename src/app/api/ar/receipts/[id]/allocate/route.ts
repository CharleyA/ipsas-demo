import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ARService } from "@/lib/services/ar.service";
import { allocateARReceiptSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const validatedData = allocateARReceiptSchema.parse({
        ...body,
        receiptId: params.id
      });
      
      const result = await ARService.allocate(validatedData, authReq.user.id);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "CLERK", "BURSAR"]);
}
