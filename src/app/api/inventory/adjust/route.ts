import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { InventoryMovementService } from "@/lib/services/inventory.service";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const movement = await InventoryMovementService.createAdjustment(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(movement);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
