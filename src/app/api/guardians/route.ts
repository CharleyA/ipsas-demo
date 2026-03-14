import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { GuardianService } from "@/lib/services/party.service";
import { createGuardianSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const guardians = await GuardianService.listByOrganisation(authReq.user.organisationId);
    return NextResponse.json(guardians);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const validatedData = createGuardianSchema.parse({
        ...body,
        organisationId: authReq.user.organisationId,
      });
      const guardian = await GuardianService.create(validatedData, authReq.user.userId);
      return NextResponse.json(guardian);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
