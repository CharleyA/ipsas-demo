import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  teacherUserId: z.string().min(1),
  grade: z.string().max(20).optional().nullable(),
  className: z.string().min(1).max(50),
  academicYear: z.string().min(4).max(20),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    if (!["ADMIN", "HEADMASTER", "BURSAR"].includes(authReq.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await prisma.classTeacherAssignment.findMany({
      where: { organisationId: authReq.user.organisationId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true, ecNumber: true } },
      },
      orderBy: [{ academicYear: "desc" }, { className: "asc" }],
    });

    return NextResponse.json({ assignments });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    if (!["ADMIN", "HEADMASTER", "BURSAR"].includes(authReq.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const assignment = await prisma.classTeacherAssignment.upsert({
      where: {
        organisationId_teacherUserId_className_academicYear: {
          organisationId: authReq.user.organisationId,
          teacherUserId: data.teacherUserId,
          className: data.className,
          academicYear: data.academicYear,
        },
      },
      update: {
        grade: data.grade ?? null,
        isPrimary: data.isPrimary ?? false,
        isActive: data.isActive ?? true,
      },
      create: {
        organisationId: authReq.user.organisationId,
        teacherUserId: data.teacherUserId,
        grade: data.grade ?? null,
        className: data.className,
        academicYear: data.academicYear,
        isPrimary: data.isPrimary ?? false,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, assignment });
  });
}
