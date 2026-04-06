import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const classFilter = searchParams.get("class");

    const isTeacher = authReq.user.role === "TEACHER";
    const teacherAssignments = isTeacher
      ? await prisma.classTeacherAssignment.findMany({
          where: {
            organisationId: authReq.user.organisationId,
            teacherUserId: authReq.user.id,
            isActive: true,
          },
          select: { className: true },
        })
      : [];

    const assignedClasses = teacherAssignments.map((a) => a.className).filter(Boolean);

    const classConstraint = isTeacher
      ? classFilter && classFilter !== "all"
        ? { class: classFilter }
        : { class: { in: assignedClasses.length ? assignedClasses : ["__NO_CLASS__"] } }
      : classFilter && classFilter !== "all"
      ? { class: classFilter }
      : {};

    const baseWhere: any = {
      organisationId: authReq.user.organisationId,
      isActive: true,
      ...classConstraint,
    };

    const students = await prisma.student.findMany({
      where: baseWhere,
      include: { arInvoices: true, arReceipts: { orderBy: { createdAt: "desc" } } },
      orderBy: { lastName: "asc" },
    });

    const studentStats = students.map((s) => {
      const totalAmount = s.arInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      const totalBalance = s.arInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
      const totalPaid = s.arReceipts.reduce((sum, rec) => sum + Number(rec.amount || 0), 0);
      const lastPaymentDate = s.arReceipts[0]?.createdAt ?? null;

      let status: "PAID" | "PARTIAL" | "UNPAID" = "UNPAID";
      if (totalAmount > 0 && totalBalance === 0) status = "PAID";
      else if (totalAmount > 0 && totalBalance < totalAmount) status = "PARTIAL";
      else status = "UNPAID";

      return {
        id: s.id,
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
        class: s.class,
        totalAmount,
        totalPaid,
        totalBalance,
        lastPaymentDate,
        status,
      };
    });

    const summary = studentStats.reduce(
      (acc, s) => {
        acc.totalStudents += 1;
        acc.totalOutstanding += s.totalBalance;
        if (s.status === "PAID") acc.paid += 1;
        if (s.status === "PARTIAL") acc.partial += 1;
        if (s.status === "UNPAID") acc.unpaid += 1;
        return acc;
      },
      { totalStudents: 0, paid: 0, partial: 0, unpaid: 0, totalOutstanding: 0 }
    );

    const classes = isTeacher
      ? assignedClasses.map((className) => ({ class: className }))
      : await prisma.student.findMany({
          where: { organisationId: authReq.user.organisationId, class: { not: null } },
          distinct: ["class"],
          select: { class: true },
          orderBy: { class: "asc" },
        });

    const receipts = await prisma.aRReceipt.findMany({
      where: {
        organisationId: authReq.user.organisationId,
        ...(isTeacher
          ? classFilter && classFilter !== "all"
            ? { student: { class: classFilter } }
            : { student: { class: { in: assignedClasses.length ? assignedClasses : ["__NO_CLASS__"] } } }
          : classFilter && classFilter !== "all"
          ? { student: { class: classFilter } }
          : {}),
      },
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentPayments = receipts.map((r) => ({
      id: r.id,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      studentNumber: r.student.studentNumber,
      amount: Number(r.amount || 0),
      createdAt: r.createdAt,
      paymentMethod: r.paymentMethod,
      reference: r.reference,
    }));

    return NextResponse.json({
      classes: classes.map((c) => c.class).filter(Boolean),
      teacherLocked: isTeacher,
      summary,
      students: studentStats,
      recentPayments,
    });
  });
}
