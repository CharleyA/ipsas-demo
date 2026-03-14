import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { SupplierService } from "@/lib/services/party.service";
import { createSupplierSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const suppliers = await SupplierService.listByOrganisation(authReq.user.organisationId);
    return NextResponse.json(suppliers);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const validatedData = createSupplierSchema.parse({
        ...body,
        organisationId: authReq.user.organisationId,
      });
      
      const supplier = await SupplierService.create(validatedData, authReq.user.userId);
      return NextResponse.json(supplier);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
