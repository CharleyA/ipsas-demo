import { NextRequest, NextResponse } from "next/server";
import { APService } from "@/lib/services/ap.service";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const statement = await APService.getSupplierStatement(params.id);
    return NextResponse.json(statement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
