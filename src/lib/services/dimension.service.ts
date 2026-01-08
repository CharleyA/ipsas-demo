import prisma from "@/lib/db";
import { AuditService } from "./audit.service";

export class DimensionService {
  static async createFund(data: {
    organisationId: string;
    code: string;
    name: string;
  }, actorId: string) {
    const fund = await prisma.fund.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "FUND",
      entityId: fund.id,
      newValues: fund,
    });

    return fund;
  }

  static async createProject(data: {
    organisationId: string;
    code: string;
    name: string;
  }, actorId: string) {
    const project = await prisma.project.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "PROJECT",
      entityId: project.id,
      newValues: project,
    });

    return project;
  }

  static async listFunds(organisationId: string) {
    return prisma.fund.findMany({
      where: { organisationId, isActive: true },
      orderBy: { code: "asc" },
    });
  }

  static async listProjects(organisationId: string) {
    return prisma.project.findMany({
      where: { organisationId, isActive: true },
      orderBy: { code: "asc" },
    });
  }
}
