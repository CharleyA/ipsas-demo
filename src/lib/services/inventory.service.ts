import prisma from "@/lib/db";
import { AuditService } from "./audit.service";

export class InventoryCategoryService {
  static async create(
    data: {
      organisationId: string;
      code: string;
      name: string;
      inventoryAccountId: string;
      expenseAccountId: string;
      reorderLevel?: number;
    },
    actorId: string
  ) {
    const category = await prisma.inventoryCategory.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
        inventoryAccountId: data.inventoryAccountId,
        expenseAccountId: data.expenseAccountId,
        reorderLevel: data.reorderLevel,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "InventoryCategory",
      entityId: category.id,
      newValues: category,
    });

    return category;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      inventoryAccountId?: string;
      expenseAccountId?: string;
      reorderLevel?: number;
      isActive?: boolean;
    },
    actorId: string
  ) {
    const old = await prisma.inventoryCategory.findUnique({ where: { id } });
    if (!old) throw new Error("Inventory category not found");

    const category = await prisma.inventoryCategory.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: actorId,
      organisationId: category.organisationId,
      action: "UPDATE",
      entityType: "InventoryCategory",
      entityId: id,
      oldValues: old,
      newValues: category,
    });

    return category;
  }

  static async findById(id: string) {
    return prisma.inventoryCategory.findUnique({ where: { id } });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.inventoryCategory.findMany({
      where: { organisationId },
      orderBy: { code: "asc" },
    });
  }
}

export class InventoryItemService {
  static async create(
    data: {
      organisationId: string;
      categoryId: string;
      code: string;
      name: string;
      unitOfMeasure?: string;
      reorderLevel?: number;
    },
    actorId: string
  ) {
    const item = await prisma.inventoryItem.create({
      data: {
        organisationId: data.organisationId,
        categoryId: data.categoryId,
        code: data.code,
        name: data.name,
        unitOfMeasure: data.unitOfMeasure || "EACH",
        reorderLevel: data.reorderLevel,
      },
      include: { category: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "InventoryItem",
      entityId: item.id,
      newValues: item,
    });

    return item;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      unitOfMeasure?: string;
      reorderLevel?: number;
      isActive?: boolean;
    },
    actorId: string
  ) {
    const old = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!old) throw new Error("Inventory item not found");

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
      include: { category: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: item.organisationId,
      action: "UPDATE",
      entityType: "InventoryItem",
      entityId: id,
      oldValues: old,
      newValues: item,
    });

    return item;
  }

  static async findById(id: string) {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  static async listByOrganisation(
    organisationId: string,
    options?: { categoryId?: string; belowReorder?: boolean }
  ) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        organisationId,
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
      },
      include: { category: true },
      orderBy: { code: "asc" },
    });

    if (options?.belowReorder) {
      return items.filter(
        (item) =>
          item.reorderLevel &&
          Number(item.quantityOnHand) <= Number(item.reorderLevel)
      );
    }

    return items;
  }
}

export class InventoryMovementService {
  static async createReceipt(
    data: {
      organisationId: string;
      itemId: string;
      movementDate: string | Date;
      quantity: number;
      unitCost: number;
      referenceType?: string;
      referenceId?: string;
      voucherId?: string;
      notes?: string;
    },
    actorId: string
  ) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });
    if (!item) throw new Error("Inventory item not found");

    const currentQty = Number(item.quantityOnHand);
    const currentValue = currentQty * Number(item.averageCost);
    const newQty = currentQty + data.quantity;
    const newValue = currentValue + data.quantity * data.unitCost;
    const newAvgCost = newQty > 0 ? newValue / newQty : data.unitCost;

    const movement = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organisationId: data.organisationId,
          itemId: data.itemId,
          movementType: "RECEIPT",
          movementDate: new Date(data.movementDate),
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost: data.quantity * data.unitCost,
          balanceQty: newQty,
          balanceValue: newValue,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          voucherId: data.voucherId,
          notes: data.notes,
          createdById: actorId,
        },
      });

      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantityOnHand: newQty,
          averageCost: newAvgCost,
          lastPurchasePrice: data.unitCost,
        },
      });

      return movement;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "RECEIPT",
      entityType: "InventoryMovement",
      entityId: movement.id,
      newValues: movement,
    });

    return movement;
  }

  static async createIssue(
    data: {
      organisationId: string;
      itemId: string;
      movementDate: string | Date;
      quantity: number;
      issuedTo?: string;
      voucherId?: string;
      notes?: string;
    },
    actorId: string
  ) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });
    if (!item) throw new Error("Inventory item not found");

    const currentQty = Number(item.quantityOnHand);
    if (currentQty < data.quantity) {
      throw new Error(
        `Insufficient stock. Available: ${currentQty}, Requested: ${data.quantity}`
      );
    }

    const avgCost = Number(item.averageCost);
    const newQty = currentQty - data.quantity;
    const newValue = newQty * avgCost;

    const movement = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organisationId: data.organisationId,
          itemId: data.itemId,
          movementType: "ISSUE",
          movementDate: new Date(data.movementDate),
          quantity: -data.quantity,
          unitCost: avgCost,
          totalCost: data.quantity * avgCost,
          balanceQty: newQty,
          balanceValue: newValue,
          issuedTo: data.issuedTo,
          voucherId: data.voucherId,
          notes: data.notes,
          createdById: actorId,
        },
      });

      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: { quantityOnHand: newQty },
      });

      return movement;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "ISSUE",
      entityType: "InventoryMovement",
      entityId: movement.id,
      newValues: movement,
    });

    return movement;
  }

  static async createAdjustment(
    data: {
      organisationId: string;
      itemId: string;
      movementDate: string | Date;
      quantity: number;
      notes?: string;
    },
    actorId: string
  ) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });
    if (!item) throw new Error("Inventory item not found");

    const currentQty = Number(item.quantityOnHand);
    const avgCost = Number(item.averageCost);
    const newQty = currentQty + data.quantity;
    const newValue = newQty * avgCost;

    const movementType = data.quantity >= 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

    const movement = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organisationId: data.organisationId,
          itemId: data.itemId,
          movementType,
          movementDate: new Date(data.movementDate),
          quantity: data.quantity,
          unitCost: avgCost,
          totalCost: Math.abs(data.quantity) * avgCost,
          balanceQty: newQty,
          balanceValue: newValue,
          notes: data.notes,
          createdById: actorId,
        },
      });

      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: { quantityOnHand: newQty },
      });

      return movement;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: movementType,
      entityType: "InventoryMovement",
      entityId: movement.id,
      newValues: movement,
    });

    return movement;
  }

  static async listByItem(itemId: string) {
    return prisma.inventoryMovement.findMany({
      where: { itemId },
      orderBy: { movementDate: "desc" },
    });
  }

  static async listByOrganisation(
    organisationId: string,
    options?: { fromDate?: Date; toDate?: Date }
  ) {
    return prisma.inventoryMovement.findMany({
      where: {
        organisationId,
        ...(options?.fromDate || options?.toDate
          ? {
              movementDate: {
                ...(options?.fromDate ? { gte: options.fromDate } : {}),
                ...(options?.toDate ? { lte: options.toDate } : {}),
              },
            }
          : {}),
      },
      include: { item: true },
      orderBy: { movementDate: "desc" },
    });
  }
}
