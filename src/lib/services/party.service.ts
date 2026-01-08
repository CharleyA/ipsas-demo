import prisma from "@/lib/db";
import { CreateStudentInput } from "@/lib/validations/schemas";
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
