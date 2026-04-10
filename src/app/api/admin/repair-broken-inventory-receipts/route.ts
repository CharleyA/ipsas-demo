import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "apply" ? "apply" : "inspect";
    const organisationId = auth.organisationId;
    const actorId = auth.userId;
    const poId = body.poId ? String(body.poId) : undefined;
    const lineMappings = body.lineMappings && typeof body.lineMappings === "object" ? body.lineMappings : {};

    const brokenLines = await prisma.purchaseOrderLine.findMany({
      where: {
        purchaseOrder: {
          organisationId,
          ...(poId ? { id: poId } : {}),
        },
        itemType: "INVENTORY",
        inventoryItemId: null,
        qtyReceived: { gt: 0 },
      },
      include: {
        purchaseOrder: {
          include: {
            grns: {
              include: {
                lines: true,
              },
              orderBy: { receivedDate: "asc" },
            },
          },
        },
      },
      orderBy: [
        { purchaseOrder: { createdAt: "asc" } },
        { lineNumber: "asc" },
      ],
    });

    const inspection = brokenLines.map((line) => {
      const relatedGrns = line.purchaseOrder.grns
        .map((grn) => {
          const grnLine = grn.lines.find((gLine) => gLine.poLineId === line.id);
          if (!grnLine) return null;
          return {
            grnId: grn.id,
            grnNumber: grn.grnNumber,
            receivedDate: grn.receivedDate,
            qtyAccepted: Number(grnLine.qtyAccepted || 0),
            qtyDelivered: Number(grnLine.qtyDelivered || 0),
          };
        })
        .filter(Boolean);

      const totalAcceptedFromGrn = relatedGrns.reduce((sum: number, grn: any) => sum + Number(grn.qtyAccepted || 0), 0);

      return {
        poId: line.poId,
        poNumber: line.purchaseOrder.poNumber,
        poLineId: line.id,
        lineNumber: line.lineNumber,
        description: line.description,
        qtyOrdered: Number(line.quantity || 0),
        qtyReceived: Number(line.qtyReceived || 0),
        totalAcceptedFromGrn,
        suggestedQtyToRepair: totalAcceptedFromGrn,
        grns: relatedGrns,
        mappedInventoryItemId: lineMappings[line.id] || null,
      };
    });

    if (mode !== "apply") {
      return NextResponse.json({
        message: "Broken inventory receipt inspection complete",
        summary: {
          brokenLineCount: inspection.length,
          poCount: new Set(inspection.map((line) => line.poId)).size,
        },
        lines: inspection,
      });
    }

    const missingMappings = inspection.filter((line) => !lineMappings[line.poLineId]);
    if (missingMappings.length > 0) {
      return NextResponse.json({
        error: "Missing inventory item mappings for one or more broken PO lines",
        missingMappings: missingMappings.map((line) => ({
          poNumber: line.poNumber,
          poLineId: line.poLineId,
          lineNumber: line.lineNumber,
          description: line.description,
        })),
      }, { status: 400 });
    }

    const repaired: any[] = [];
    const skipped: any[] = [];

    for (const line of inspection) {
      const inventoryItemId = String(lineMappings[line.poLineId]);

      try {
        const item = await prisma.inventoryItem.findFirst({
          where: { id: inventoryItemId, organisationId },
        });

        if (!item) {
          skipped.push({
            poNumber: line.poNumber,
            poLineId: line.poLineId,
            reason: "Mapped inventory item not found in this organisation",
          });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.purchaseOrderLine.update({
            where: { id: line.poLineId },
            data: { inventoryItemId },
          });

          for (const grn of line.grns) {
            const qtyAccepted = Number(grn.qtyAccepted || 0);
            if (qtyAccepted <= 0) continue;

            const existingMovement = await tx.inventoryMovement.findFirst({
              where: {
                organisationId,
                itemId: inventoryItemId,
                referenceType: "PURCHASE",
                referenceId: grn.grnId,
                notes: { contains: grn.grnNumber },
              },
            });

            if (existingMovement) {
              continue;
            }

            const currentItem = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
            if (!currentItem) {
              throw new Error(`Inventory item not found during repair: ${inventoryItemId}`);
            }

            const currentQty = Number(currentItem.quantityOnHand || 0);
            const currentValue = currentQty * Number(currentItem.averageCost || 0);
            const poLine = await tx.purchaseOrderLine.findUnique({ where: { id: line.poLineId } });
            const unitCost = Number(poLine?.unitPrice || 0);
            const newQty = currentQty + qtyAccepted;
            const newValue = currentValue + qtyAccepted * unitCost;
            const newAvgCost = newQty > 0 ? newValue / newQty : unitCost;

            await tx.inventoryMovement.create({
              data: {
                organisationId,
                itemId: inventoryItemId,
                movementType: "RECEIPT",
                movementDate: new Date(grn.receivedDate),
                quantity: qtyAccepted,
                unitCost,
                totalCost: qtyAccepted * unitCost,
                balanceQty: newQty,
                balanceValue: newValue,
                referenceType: "PURCHASE",
                referenceId: grn.grnId,
                notes: `GRN: ${grn.grnNumber} (repair)` ,
                createdById: actorId,
              },
            });

            await tx.inventoryItem.update({
              where: { id: inventoryItemId },
              data: {
                quantityOnHand: newQty,
                averageCost: newAvgCost,
                lastPurchasePrice: unitCost,
              },
            });
          }
        });

        repaired.push({
          poNumber: line.poNumber,
          poLineId: line.poLineId,
          inventoryItemId,
          repairedQty: line.suggestedQtyToRepair,
        });
      } catch (error: any) {
        skipped.push({
          poNumber: line.poNumber,
          poLineId: line.poLineId,
          reason: error?.message || String(error),
        });
      }
    }

    return NextResponse.json({
      message: "Broken inventory receipt repair complete",
      summary: {
        inspected: inspection.length,
        repaired: repaired.length,
        skipped: skipped.length,
      },
      repaired,
      skipped,
    });
  } catch (error: any) {
    console.error("Repair Broken Inventory Receipts Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
