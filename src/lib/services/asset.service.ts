import prisma from "@/lib/db";
import { AuditService } from "./audit.service";

export class AssetCategoryService {
  static async create(
    data: {
      organisationId: string;
      code: string;
      name: string;
      assetAccountId: string;
      depreciationAccountId: string;
      accumulatedDepAccountId: string;
      depreciationMethod?: "STRAIGHT_LINE" | "REDUCING_BALANCE";
      usefulLifeMonths: number;
      residualValuePercent?: number;
    },
    actorId: string
  ) {
    const category = await prisma.assetCategory.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
        assetAccountId: data.assetAccountId,
        depreciationAccountId: data.depreciationAccountId,
        accumulatedDepAccountId: data.accumulatedDepAccountId,
        depreciationMethod: data.depreciationMethod || "STRAIGHT_LINE",
        usefulLifeMonths: data.usefulLifeMonths,
        residualValuePercent: data.residualValuePercent || 0,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "AssetCategory",
      entityId: category.id,
      newValues: category,
    });

    return category;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      assetAccountId?: string;
      depreciationAccountId?: string;
      accumulatedDepAccountId?: string;
      depreciationMethod?: "STRAIGHT_LINE" | "REDUCING_BALANCE";
      usefulLifeMonths?: number;
      residualValuePercent?: number;
      isActive?: boolean;
    },
    actorId: string
  ) {
    const old = await prisma.assetCategory.findUnique({ where: { id } });
    if (!old) throw new Error("Asset category not found");

    const category = await prisma.assetCategory.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: actorId,
      organisationId: category.organisationId,
      action: "UPDATE",
      entityType: "AssetCategory",
      entityId: id,
      oldValues: old,
      newValues: category,
    });

    return category;
  }

  static async findById(id: string) {
    return prisma.assetCategory.findUnique({ where: { id } });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.assetCategory.findMany({
      where: { organisationId },
      orderBy: { code: "asc" },
    });
  }
}

export class AssetService {
  static async generateAssetNumber(organisationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.asset.count({
      where: {
        organisationId,
        assetNumber: { startsWith: `AST-${year}-` },
      },
    });
    return `AST-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  static async create(
    data: {
      organisationId: string;
      categoryId: string;
      description: string;
      serialNumber?: string;
      location?: string;
      custodian?: string;
      acquisitionDate: string | Date;
      acquisitionCost: number;
      sourceApBillLineId?: string;
    },
    actorId: string
  ) {
    const category = await prisma.assetCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) throw new Error("Asset category not found");

    const assetNumber = await this.generateAssetNumber(data.organisationId);
    const residualValue =
      (data.acquisitionCost * Number(category.residualValuePercent)) / 100;

    const asset = await prisma.asset.create({
      data: {
        organisationId: data.organisationId,
        categoryId: data.categoryId,
        assetNumber,
        description: data.description,
        serialNumber: data.serialNumber,
        location: data.location,
        custodian: data.custodian,
        acquisitionDate: new Date(data.acquisitionDate),
        acquisitionCost: data.acquisitionCost,
        residualValue,
        netBookValue: data.acquisitionCost,
        sourceApBillLineId: data.sourceApBillLineId,
      },
      include: { category: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Asset",
      entityId: asset.id,
      newValues: asset,
    });

    return asset;
  }

  static async update(
    id: string,
    data: {
      description?: string;
      serialNumber?: string;
      location?: string;
      custodian?: string;
    },
    actorId: string
  ) {
    const old = await prisma.asset.findUnique({ where: { id } });
    if (!old) throw new Error("Asset not found");

    const asset = await prisma.asset.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: actorId,
      organisationId: asset.organisationId,
      action: "UPDATE",
      entityType: "Asset",
      entityId: id,
      oldValues: old,
      newValues: asset,
    });

    return asset;
  }

  static async dispose(
    id: string,
    data: {
      disposalDate: string | Date;
      disposalAmount: number;
      disposalNotes?: string;
    },
    actorId: string
  ) {
    const old = await prisma.asset.findUnique({ where: { id } });
    if (!old) throw new Error("Asset not found");

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        status: "DISPOSED",
        disposalDate: new Date(data.disposalDate),
        disposalAmount: data.disposalAmount,
        disposalNotes: data.disposalNotes,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: asset.organisationId,
      action: "DISPOSE",
      entityType: "Asset",
      entityId: id,
      oldValues: old,
      newValues: asset,
    });

    return asset;
  }

  static async findById(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        depreciationEntries: { orderBy: { depreciationDate: "desc" } },
      },
    });
  }

  static async listByOrganisation(
    organisationId: string,
    options?: { status?: string; categoryId?: string; location?: string }
  ) {
    return prisma.asset.findMany({
      where: {
        organisationId,
        ...(options?.status ? { status: options.status as any } : {}),
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.location
          ? { location: { equals: options.location, mode: "insensitive" } }
          : {}),
      },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { assetNumber: "asc" }],
    });
  }

  static async calculateDepreciation(
    assetId: string,
    periodId: string,
    depreciationDate: Date
  ): Promise<number> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { category: true },
    });
    if (!asset || asset.status !== "ACTIVE") return 0;

    const existing = await prisma.depreciationEntry.findUnique({
      where: { assetId_periodId: { assetId, periodId } },
    });
    if (existing) return 0;

    const category = asset.category;
    const depreciableAmount =
      Number(asset.acquisitionCost) - Number(asset.residualValue);

    let monthlyDepreciation = 0;

    if (category.depreciationMethod === "STRAIGHT_LINE") {
      monthlyDepreciation = depreciableAmount / category.usefulLifeMonths;
    } else {
      const annualRate = (2 / category.usefulLifeMonths) * 12;
      monthlyDepreciation = (Number(asset.netBookValue) * annualRate) / 12;
    }

    const maxDepreciation =
      Number(asset.netBookValue) - Number(asset.residualValue);
    monthlyDepreciation = Math.min(
      monthlyDepreciation,
      Math.max(0, maxDepreciation)
    );

    return Math.round(monthlyDepreciation * 100) / 100;
  }

  static async runDepreciation(
    organisationId: string,
    periodId: string,
    depreciationDate: Date,
    actorId: string
  ) {
    const assets = await prisma.asset.findMany({
      where: { organisationId, status: "ACTIVE" },
      include: { category: true },
    });

    const entries: Array<{ assetId: string; amount: number }> = [];

    for (const asset of assets) {
      const amount = await this.calculateDepreciation(
        asset.id,
        periodId,
        depreciationDate
      );
      if (amount > 0) {
        entries.push({ assetId: asset.id, amount });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdEntries = [] as any[];

      for (const entry of entries) {
        const depEntry = await tx.depreciationEntry.create({
          data: {
            assetId: entry.assetId,
            periodId,
            depreciationDate,
            amount: entry.amount,
          },
        });

        await tx.asset.update({
          where: { id: entry.assetId },
          data: {
            accumulatedDepreciation: { increment: entry.amount },
            netBookValue: { decrement: entry.amount },
          },
        });

        createdEntries.push(depEntry);
      }

      return createdEntries;
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "RUN_DEPRECIATION",
      entityType: "DepreciationBatch",
      entityId: periodId,
      newValues: {
        periodId,
        depreciationDate,
        entriesCount: result.length,
        totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
      },
    });

    return {
      entriesCount: result.length,
      totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
    };
  }

  static async registerFromPending(
    pendingId: string,
    assetsData: Array<{
      description: string;
      serialNumber?: string;
      location?: string;
      custodian?: string;
    }>,
    actorId: string
  ) {
    const pending = await prisma.pendingAsset.findUnique({
      where: { id: pendingId },
    });
    if (!pending) throw new Error("Pending asset not found");
    if (pending.status !== "PENDING") throw new Error("Already processed");

    const assetIds = await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const assetData of assetsData) {
        const assetNumber = await this.generateAssetNumber(pending.organisationId);
        const category = await tx.assetCategory.findUnique({
          where: { id: pending.categoryId },
        });
        if (!category) throw new Error("Asset category not found");

        const residualValue =
          ((Number(pending.acquisitionCost) / pending.quantity) *
            Number(category.residualValuePercent)) /
          100;

        const costPerAsset = Number(pending.acquisitionCost) / pending.quantity;

        const asset = await tx.asset.create({
          data: {
            organisationId: pending.organisationId,
            categoryId: pending.categoryId,
            assetNumber,
            description: assetData.description,
            serialNumber: assetData.serialNumber,
            location: assetData.location,
            custodian: assetData.custodian,
            acquisitionDate: new Date(),
            acquisitionCost: costPerAsset,
            residualValue,
            netBookValue: costPerAsset,
            sourceApBillLineId: pending.apBillLineId,
          },
        });
        createdIds.push(asset.id);
      }

      await tx.pendingAsset.update({
        where: { id: pendingId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          assetIds: createdIds,
        },
      });

      return createdIds;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: pending.organisationId,
      action: "REGISTER",
      entityType: "PendingAsset",
      entityId: pendingId,
      newValues: { assetIds },
    });

    return assetIds;
  }
}

export class PendingAssetService {
  static async listByOrganisation(organisationId: string) {
    return prisma.pendingAsset.findMany({
      where: {
        organisationId,
        status: "PENDING",
      },
      include: {
        category: true,
        apBillLine: {
          include: {
            bill: {
              select: {
                id: true,
                supplier: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async complete(
    pendingId: string,
    assetsData: Array<{
      description: string;
      serialNumber?: string;
      location?: string;
      custodian?: string;
    }>,
    actorId: string
  ) {
    const assetIds = await AssetService.registerFromPending(
      pendingId,
      assetsData,
      actorId
    );

    return {
      success: true,
      assetIds,
      count: assetIds.length,
    };
  }
}
