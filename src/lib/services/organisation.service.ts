import prisma from "@/lib/db";
import type { CreateOrganisationInput, UpdateOrganisationInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class OrganisationService {
  static async create(data: CreateOrganisationInput, creatorId: string) {
    const org = await prisma.organisation.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        baseCurrency: data.baseCurrency ?? "ZWG",
        fiscalYearStart: data.fiscalYearStart ?? 1,
        address: data.address,
        phone: data.phone,
        email: data.email,
      },
    });

    await prisma.organisationUser.create({
      data: {
        organisationId: org.id,
        userId: creatorId,
        role: "ADMIN",
      },
    });

    await AuditService.log({
      userId: creatorId,
      organisationId: org.id,
      action: "CREATE",
      entityType: "Organisation",
      entityId: org.id,
      newValues: org,
    });

    return org;
  }

  static async findById(id: string) {
    return prisma.organisation.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        currencies: {
          include: { currency: true },
        },
      },
    });
  }

  static async findByCode(code: string) {
    return prisma.organisation.findUnique({
      where: { code },
    });
  }

  static async update(id: string, data: UpdateOrganisationInput, actorId: string) {
    const oldOrg = await prisma.organisation.findUnique({ where: { id } });
    
    const org = await prisma.organisation.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: actorId,
      organisationId: id,
      action: "UPDATE",
      entityType: "Organisation",
      entityId: id,
      oldValues: oldOrg,
      newValues: org,
    });

    return org;
  }

  static async list(options?: {
    isActive?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.type) where.type = options.type;

    return prisma.organisation.findMany({
      where,
      orderBy: { name: "asc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  static async getUsers(organisationId: string) {
    return prisma.organisationUser.findMany({
      where: { organisationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
        },
      },
    });
  }

  static async addCurrency(organisationId: string, currencyCode: string, isBaseCurrency: boolean, actorId: string) {
    if (isBaseCurrency) {
      await prisma.organisationCurrency.updateMany({
        where: { organisationId, isBaseCurrency: true },
        data: { isBaseCurrency: false },
      });
    }

    const orgCurrency = await prisma.organisationCurrency.create({
      data: {
        organisationId,
        currencyCode,
        isBaseCurrency,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "ADD_CURRENCY",
      entityType: "OrganisationCurrency",
      entityId: orgCurrency.id,
      newValues: orgCurrency,
    });

    return orgCurrency;
  }

  static async getCurrencies(organisationId: string) {
    return prisma.organisationCurrency.findMany({
      where: { organisationId, isActive: true },
      include: { currency: true },
    });
  }
}
