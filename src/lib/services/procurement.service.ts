import prisma from "@/lib/db";
import { AuditService } from "./audit.service";
import { Prisma } from "@prisma/client";

export class PurchaseOrderService {
  static async generatePONumber(organisationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.purchaseOrder.count({
      where: {
        organisationId,
        poNumber: { startsWith: `PO-${year}-` },
      },
    });
    return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  static async create(
    data: {
      organisationId: string;
      supplierId: string;
      procurementRef?: string;
      quotationRef?: string;
      orderDate: string | Date;
      expectedDate?: string | Date;
      currencyCode?: string;
      notes?: string;
      lines: {
        description: string;
        itemType: "CAPITAL_ITEM" | "INVENTORY" | "DIRECT_EXPENSE";
        inventoryItemId?: string;
        assetCategoryId?: string;
        accountId: string;
        quantity: number;
        unitPrice: number;
      }[];
    },
    actorId: string
  ) {
    const poNumber = await this.generatePONumber(data.organisationId);

    const totalAmount = data.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        organisationId: data.organisationId,
        poNumber,
        supplierId: data.supplierId,
        procurementRef: data.procurementRef,
        quotationRef: data.quotationRef,
        orderDate: new Date(data.orderDate),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalAmount,
        currencyCode: data.currencyCode || "USD",
        notes: data.notes,
        createdById: actorId,
        lines: {
          create: data.lines.map((line, index) => ({
            lineNumber: index + 1,
            description: line.description,
            itemType: line.itemType,
            inventoryItemId: line.inventoryItemId,
            assetCategoryId: line.assetCategoryId,
            accountId: line.accountId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.quantity * line.unitPrice,
          })),
        },
      },
      include: { lines: true, supplier: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: po,
    });

    return po;
  }

  static async approve(poId: string, actorId: string) {
    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: "APPROVED",
        approvedById: actorId,
        approvedAt: new Date(),
      },
      include: { lines: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: po.organisationId,
      action: "APPROVE",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { status: "APPROVED" },
    });

    return po;
  }

  static async cancel(poId: string, actorId: string) {
    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "CANCELLED" },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: po.organisationId,
      action: "CANCEL",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { status: "CANCELLED" },
    });

    return po;
  }

  static async findById(id: string) {
    return prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: {
          include: {
            inventoryItem: true,
            assetCategory: true,
          },
        },
        grns: true,
      },
    });
  }

  static async listByOrganisation(
    organisationId: string,
    options?: { status?: string }
  ) {
    return prisma.purchaseOrder.findMany({
      where: {
        organisationId,
        ...(options?.status ? { status: options.status as any } : {}),
      },
      include: { supplier: true, lines: true },
      orderBy: { createdAt: "desc" },
    });
  }
}

export class GRNService {
  static async generateGRNNumber(organisationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.goodsReceivedNote.count({
      where: {
        organisationId,
        grnNumber: { startsWith: `GRN-${year}-` },
      },
    });
    return `GRN-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  static async create(
    data: {
      organisationId: string;
      poId: string;
      supplierId: string;
      receivedDate: string | Date;
      deliveryNoteRef?: string;
      inspectionNotes?: string;
      lines: {
        poLineId: string;
        qtyDelivered: number;
        qtyAccepted: number;
        qtyRejected?: number;
        rejectionReason?: string;
      }[];
    },
    actorId: string
  ) {
    const grnNumber = await this.generateGRNNumber(data.organisationId);

    const grn = await prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceivedNote.create({
        data: {
          organisationId: data.organisationId,
          grnNumber,
          poId: data.poId,
          supplierId: data.supplierId,
          receivedDate: new Date(data.receivedDate),
          deliveryNoteRef: data.deliveryNoteRef,
          inspectionNotes: data.inspectionNotes,
          status: "INSPECTED",
          createdById: actorId,
          inspectedById: actorId,
          lines: {
            create: data.lines.map((line) => ({
              poLineId: line.poLineId,
              qtyDelivered: line.qtyDelivered,
              qtyAccepted: line.qtyAccepted,
              qtyRejected: line.qtyRejected || 0,
              rejectionReason: line.rejectionReason,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of data.lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: {
            qtyReceived: { increment: line.qtyAccepted },
          },
        });
      }

      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.poId },
        include: { lines: true },
      });

      if (po) {
        const allReceived = po.lines.every(
          (line) =>
            Number(line.qtyReceived) + 
            data.lines.find((l) => l.poLineId === line.id)?.qtyAccepted || 0 >=
            Number(line.quantity)
        );

        await tx.purchaseOrder.update({
          where: { id: data.poId },
          data: {
            status: allReceived ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED",
          },
        });
      }

      return grn;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "GoodsReceivedNote",
      entityId: grn.id,
      newValues: grn,
    });

    return grn;
  }

  static async findById(id: string) {
    return prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: { include: { lines: true } },
        lines: { include: { poLine: true } },
      },
    });
  }

  static async listByOrganisation(organisationId: string) {
    return prisma.goodsReceivedNote.findMany({
      where: { organisationId },
      include: { supplier: true, purchaseOrder: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async listByPO(poId: string) {
    return prisma.goodsReceivedNote.findMany({
      where: { poId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
