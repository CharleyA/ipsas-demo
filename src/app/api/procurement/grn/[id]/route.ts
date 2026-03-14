import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { GRNService } from "@/lib/services/procurement.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const grn = await GRNService.findById(id);
    if (!grn) {
      return NextResponse.json({ error: "GRN not found" }, { status: 404 });
    }
    return NextResponse.json(grn);
  });
}
