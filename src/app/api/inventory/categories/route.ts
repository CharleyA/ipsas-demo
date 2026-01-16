import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { InventoryCategoryService } from "@/lib/services/inventory.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const categories = await InventoryCategoryService.listByOrganisation(
      authReq.user.organisationId
    );
    return NextResponse.json(categories);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const category = await InventoryCategoryService.create(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(category);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
