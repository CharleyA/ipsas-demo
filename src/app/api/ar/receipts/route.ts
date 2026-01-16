import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ARService } from "@/lib/services/ar.service";
import { createARReceiptSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const validatedData = createARReceiptSchema.parse(body);
      
      validatedData.organisationId = authReq.user.organisationId;
      
      const receipt = await ARService.createReceipt(validatedData, authReq.user.userId);
      return NextResponse.json(receipt, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "CLERK", "BURSAR"]);
}
