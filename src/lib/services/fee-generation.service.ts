import prisma from "@/lib/db";
import { AuditService } from "./audit.service";
import { ARService } from "./ar.service";

export class FeeTemplateService {
  static async create(
    data: {
      organisationId: string;
      name: string;
      description?: string;
      academicYear: number;
      term: string;
      grades: string[];
      currencyCode?: string;
      dueAfterDays?: number;
      items: { description: string; amount: number }[];
    },
    actorId: string
  ) {
    const template = await prisma.feeTemplate.create({
      data: {
        organisationId: data.organisationId,
        name: data.name,
        description: data.description,
        academicYear: data.academicYear,
        term: data.term,
        grades: data.grades,
        currencyCode: data.currencyCode || "USD",
        dueAfterDays: data.dueAfterDays || 30,
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            amount: item.amount,
            order: index,
          })),
        },
      },
      include: { items: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "FeeTemplate",
      entityId: template.id,
      newValues: template,
    });

    return template;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      grades?: string[];
      currencyCode?: string;
      dueAfterDays?: number;
      isActive?: boolean;
      items?: { description: string; amount: number }[];
    },
    actorId: string
  ) {
    const old = await prisma.feeTemplate.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!old) throw new Error("Fee template not found");

    const template = await prisma.$transaction(async (tx) => {
      // If items are provided, delete old items and create new ones
      if (data.items) {
        await tx.feeTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.feeTemplateItem.createMany({
          data: data.items.map((item, index) => ({
            templateId: id,
            description: item.description,
            amount: item.amount,
            order: index,
          })),
        });
      }

      return tx.feeTemplate.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          grades: data.grades,
          currencyCode: data.currencyCode,
          dueAfterDays: data.dueAfterDays,
          isActive: data.isActive,
        },
        include: { items: true },
      });
    });

    await AuditService.log({
      userId: actorId,
      organisationId: template.organisationId,
      action: "UPDATE",
      entityType: "FeeTemplate",
      entityId: id,
      oldValues: old,
      newValues: template,
    });

    return template;
  }

  static async findById(id: string) {
    return prisma.feeTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { order: "asc" } } },
    });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.feeTemplate.findMany({
      where: { organisationId },
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: [{ academicYear: "desc" }, { term: "asc" }],
    });
  }
}

export class FeeGenerationService {
  static async generateBatchNumber(organisationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.feeGenerationBatch.count({
      where: {
        organisationId,
        batchNumber: { startsWith: `FEE-${year}-` },
      },
    });
    return `FEE-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  static async preview(
    data: {
      organisationId: string;
      templateId: string;
      grades?: string[];
    }
  ) {
    const template = await prisma.feeTemplate.findUnique({
      where: { id: data.templateId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!template) throw new Error("Fee template not found");

    // Get applicable grades (from input or template default)
    const grades = data.grades?.length ? data.grades : template.grades;

    // Find matching students
    const students = await prisma.student.findMany({
      where: {
        organisationId: data.organisationId,
        isActive: true,
        ...(grades.length > 0 ? { grade: { in: grades } } : {}),
      },
      orderBy: [{ grade: "asc" }, { lastName: "asc" }],
    });

    // Calculate totals
    const totalPerStudent = template.items.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalAmount = totalPerStudent * students.length;

    return {
      template,
      students,
      grades,
      totalPerStudent,
      totalStudents: students.length,
      totalAmount,
      items: template.items,
    };
  }

  static async generate(
    data: {
      organisationId: string;
      templateId: string;
      grades?: string[];
      invoiceDate?: Date;
    },
    actorId: string
  ) {
    const template = await prisma.feeTemplate.findUnique({
      where: { id: data.templateId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!template) throw new Error("Fee template not found");

    const grades = data.grades?.length ? data.grades : template.grades;
    const invoiceDate = data.invoiceDate || new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + template.dueAfterDays);

    // Find matching students
    const students = await prisma.student.findMany({
      where: {
        organisationId: data.organisationId,
        isActive: true,
        ...(grades.length > 0 ? { grade: { in: grades } } : {}),
      },
    });

    if (students.length === 0) {
      throw new Error("No students found matching the criteria");
    }

    const totalPerStudent = template.items.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalAmount = totalPerStudent * students.length;
    const batchNumber = await this.generateBatchNumber(data.organisationId);

    // Create batch
    const batch = await prisma.feeGenerationBatch.create({
      data: {
        organisationId: data.organisationId,
        templateId: template.id,
        batchNumber,
        academicYear: template.academicYear,
        term: template.term,
        totalStudents: students.length,
        totalAmount,
        status: "PROCESSING",
        createdById: actorId,
      },
    });

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as { studentId: string; error: string }[],
    };

    // Generate invoices for each student
    for (const student of students) {
      try {
        const invoiceLines = template.items.map((item) => ({
          description: item.description,
          quantity: 1,
          unitPrice: Number(item.amount),
          amount: Number(item.amount),
        }));

        const invoice = await ARService.createInvoice(
          {
            organisationId: data.organisationId,
            studentId: student.id,
            currencyCode: template.currencyCode,
            term: `${template.academicYear} ${template.term}`,
            dueDate: dueDate,
            description: `School Fees - ${template.name} - ${student.firstName} ${student.lastName}`,
            lines: invoiceLines,
          },
          actorId
        );

        // Link invoice to batch
        await prisma.aRInvoice.update({
          where: { id: invoice.id },
          data: { batchId: batch.id },
        });

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          studentId: student.id,
          error: error.message,
        });
      }
    }

    // Update batch status
    const finalStatus = results.failed === 0 ? "COMPLETED" : 
                        results.successful === 0 ? "FAILED" : "COMPLETED";
    
    await prisma.feeGenerationBatch.update({
      where: { id: batch.id },
      data: { status: finalStatus },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "GENERATE_FEES",
      entityType: "FeeGenerationBatch",
      entityId: batch.id,
      newValues: {
        batchNumber,
        totalStudents: students.length,
        successful: results.successful,
        failed: results.failed,
      },
    });

    return {
      batch,
      results,
    };
  }

  static async getBatch(id: string) {
    return prisma.feeGenerationBatch.findUnique({
      where: { id },
      include: {
        template: { include: { items: true } },
        invoices: {
          include: {
            student: true,
            voucher: true,
          },
        },
      },
    });
  }

  static async listBatches(organisationId: string) {
    return prisma.feeGenerationBatch.findMany({
      where: { organisationId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
