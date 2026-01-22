import { NextRequest, NextResponse } from "next/server";
import { APService } from "@/lib/services/ap.service";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await props.params;
    const { id } = params;
    
    const statement = await APService.getSupplierStatement(id);
    return NextResponse.json(statement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
