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
