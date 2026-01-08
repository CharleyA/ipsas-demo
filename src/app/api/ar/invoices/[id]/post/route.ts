import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ARService } from "@/lib/services/ar.service";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return withAuth(req, async (authReq) => {
    try {
      const result = await ARService.postInvoice(params.id, authReq.user.id);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "BURSAR"]);
}
