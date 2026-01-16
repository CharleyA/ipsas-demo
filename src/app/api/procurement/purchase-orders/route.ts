import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { PurchaseOrderService } from "@/lib/services/procurement.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    
    const orders = await PurchaseOrderService.listByOrganisation(
      authReq.user.organisationId,
      { status }
    );
    return NextResponse.json(orders);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const order = await PurchaseOrderService.create(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(order);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
