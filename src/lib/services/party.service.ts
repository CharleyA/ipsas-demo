import prisma from "@/lib/db";
import { CreateGuardianInput, CreateStudentInput, LinkGuardianInput, UpdateGuardianInput, UpdateStudentInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class StudentService {
  static async create(data: CreateStudentInput, actorId: string) {
    const student = await prisma.student.create({
      data: {
        organisationId: data.organisationId,
        studentNumber: data.studentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        grade: data.grade,
        class: data.class,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Student",
      entityId: student.id,
      newValues: student,
    });

    return student;
  }

  static async update(id: string, data: UpdateStudentInput, actorId: string) {
    const oldStudent = await prisma.student.findUnique({ where: { id } });
    if (!oldStudent) throw new Error("Student not found");

    const student = await prisma.student.update({
      where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          grade: data.grade,
          class: data.class,
          parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        enrollmentDate: data.enrollmentDate ? new Date(data.enrollmentDate) : undefined,
        isActive: data.isActive,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: student.organisationId,
      action: "UPDATE",
      entityType: "Student",
      entityId: id,
      oldValues: oldStudent,
      newValues: student,
    });

    return student;
  }

  static async findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
    });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.student.findMany({
      where: { organisationId },
      orderBy: { lastName: "asc" },
    });
  }
}


export class GuardianService {
  static async create(data: CreateGuardianInput, actorId: string) {
    const guardian = await prisma.guardian.create({
      data: {
        organisationId: data.organisationId,
        fullName: data.fullName,
        relationship: data.relationship,
        primaryPhone: data.primaryPhone,
        secondaryPhone: data.secondaryPhone,
        address: data.address,
        email: data.email,
      },
    });

    if (data.studentIds?.length) {
      await prisma.studentGuardian.createMany({
        data: data.studentIds.map((studentId) => ({
          organisationId: data.organisationId,
          studentId,
          guardianId: guardian.id,
          isPrimaryContact: Boolean(data.isPrimaryContact),
          isBillingContact: Boolean(data.isBillingContact),
        })),
        skipDuplicates: true,
      });
    }

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Guardian",
      entityId: guardian.id,
      newValues: guardian,
    });

    return guardian;
  }

  static async update(id: string, data: UpdateGuardianInput, actorId: string) {
    const oldGuardian = await prisma.guardian.findUnique({ where: { id } });
    if (!oldGuardian) throw new Error("Guardian not found");

    const guardian = await prisma.guardian.update({
      where: { id },
      data: {
        fullName: data.fullName,
        relationship: data.relationship,
        primaryPhone: data.primaryPhone,
        secondaryPhone: data.secondaryPhone,
        address: data.address,
        email: data.email,
        isActive: data.isActive,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: guardian.organisationId,
      action: "UPDATE",
      entityType: "Guardian",
      entityId: id,
      oldValues: oldGuardian,
      newValues: guardian,
    });

    return guardian;
  }

  static async remove(id: string, actorId: string) {
    const guardian = await prisma.guardian.findUnique({ where: { id } });
    if (!guardian) throw new Error("Guardian not found");

    await prisma.guardian.delete({ where: { id } });

    await AuditService.log({
      userId: actorId,
      organisationId: guardian.organisationId,
      action: "DELETE",
      entityType: "Guardian",
      entityId: id,
      oldValues: guardian,
    });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.guardian.findMany({
      where: { organisationId },
      include: {
        studentLinks: {
          include: {
            student: {
              select: { id: true, studentNumber: true, firstName: true, lastName: true, class: true, grade: true },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }

  static async listByStudent(organisationId: string, studentId: string) {
    return prisma.studentGuardian.findMany({
      where: { organisationId, studentId },
      include: { guardian: true },
      orderBy: { createdAt: "asc" },
    });
  }

  static async linkToStudent(organisationId: string, studentId: string, data: LinkGuardianInput, actorId: string) {
    const link = await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId: data.guardianId } },
      update: {
        isPrimaryContact: Boolean(data.isPrimaryContact),
        isBillingContact: Boolean(data.isBillingContact),
      },
      create: {
        organisationId,
        studentId,
        guardianId: data.guardianId,
        isPrimaryContact: Boolean(data.isPrimaryContact),
        isBillingContact: Boolean(data.isBillingContact),
      },
      include: { guardian: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "LINK",
      entityType: "StudentGuardian",
      entityId: link.id,
      newValues: link,
    });

    return link;
  }
}

export class SupplierService {
  static async create(data: any, actorId: string) {
    const supplier = await prisma.supplier.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
        taxNumber: data.taxNumber,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier.id,
      newValues: supplier,
    });

    return supplier;
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.supplier.findMany({
      where: { organisationId },
      orderBy: { name: "asc" },
    });
  }
}
