import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ARService } from "@/lib/services/ar.service";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return withAuth(req, async (authReq) => {
    try {
      const statement = await ARService.getStudentStatement(params.id);
      return NextResponse.json(statement);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
