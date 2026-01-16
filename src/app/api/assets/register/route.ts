import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { AssetService } from "@/lib/services/asset.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    
    const assets = await AssetService.listByOrganisation(
      authReq.user.organisationId,
      { status, categoryId }
    );
    return NextResponse.json(assets);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const asset = await AssetService.create(
        {
          ...body,
          organisationId: authReq.user.organisationId,
        },
        authReq.user.userId
      );
      return NextResponse.json(asset);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
