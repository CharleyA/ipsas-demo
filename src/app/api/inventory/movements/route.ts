import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { InventoryMovementService } from "@/lib/services/inventory.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    
    const movements = await InventoryMovementService.listByOrganisation(
      authReq.user.organisationId,
      {
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      }
    );
    return NextResponse.json(movements);
  });
}
