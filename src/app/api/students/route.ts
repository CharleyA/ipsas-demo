import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { StudentService } from "@/lib/services/party.service";
import { createStudentSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const students = await StudentService.listByOrganisation(authReq.user.organisationId);
    return NextResponse.json(students);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const validatedData = createStudentSchema.parse({
        ...body,
        organisationId: authReq.user.organisationId,
      });
      
      const student = await StudentService.create(validatedData, authReq.user.id);
      return NextResponse.json(student);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
