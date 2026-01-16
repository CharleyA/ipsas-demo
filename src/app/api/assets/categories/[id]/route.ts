import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { AssetCategoryService } from "@/lib/services/asset.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const category = await AssetCategoryService.findById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const category = await AssetCategoryService.update(
        id,
        body,
        authReq.user.userId
      );
      return NextResponse.json(category);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
