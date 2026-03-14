import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { GuardianService } from "@/lib/services/party.service";
import { linkGuardianSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (authReq) => {
    const { id } = await params;
    const links = await GuardianService.listByStudent(authReq.user.organisationId, id);
    return NextResponse.json(links);
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validatedData = linkGuardianSchema.parse(body);
      const link = await GuardianService.linkToStudent(authReq.user.organisationId, id, validatedData, authReq.user.userId);
      return NextResponse.json(link);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
