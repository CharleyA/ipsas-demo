import prisma from "@/lib/db";

interface AuditLogInput {
  userId: string;
  organisationId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(input: AuditLogInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId,
        organisationId: input.organisationId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues: input.oldValues ? JSON.parse(JSON.stringify(input.oldValues)) : null,
        newValues: input.newValues ? JSON.parse(JSON.stringify(input.newValues)) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  static async getByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getByOrganisation(organisationId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    entityType?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = { organisationId };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) (where.createdAt as Record<string, unknown>).gte = options.startDate;
      if (options.endDate) (where.createdAt as Record<string, unknown>).lte = options.endDate;
    }

    if (options?.entityType) where.entityType = options.entityType;
    if (options?.action) where.action = options.action;

    return prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  static async getByUser(userId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
