import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ARService } from "@/lib/services/ar.service";
import { createARInvoiceSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const invoices = await ARService.getInvoices(authReq.user.organisationId);
      return NextResponse.json(invoices);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }, ["ADMIN", "CLERK", "BURSAR"]);
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const validatedData = createARInvoiceSchema.parse(body);
      
      validatedData.organisationId = authReq.user.organisationId;
      
      const invoice = await ARService.createInvoice(validatedData, authReq.user.userId);
      return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "CLERK", "BURSAR"]);
}
