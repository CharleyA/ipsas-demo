import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { prisma } from "@/lib/prisma";
import { InventoryMovementService } from "@/lib/services/inventory.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json();
      // body.lines: [{ lineId, qtyIssued }]

      const requisition = await prisma.stockRequisition.findUnique({
        where: { id },
        include: { lines: { include: { item: true } } },
      });
      if (!requisition) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (requisition.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requisitions can be issued" }, { status: 400 });
      }

      for (const issueLine of body.lines || []) {
        const line = requisition.lines.find((l) => l.id === issueLine.lineId);
        if (!line || issueLine.qtyIssued <= 0) continue;

        // Create inventory movement
        await InventoryMovementService.createIssue(
          {
            organisationId: authReq.user.organisationId,
            itemId: line.itemId,
            movementDate: new Date(),
            quantity: issueLine.qtyIssued,
            issuedTo: requisition.department || "Requisition",
            notes: `REQ: ${requisition.reqNumber}`,
          },
          authReq.user.userId
        );

        // Update line qty issued
        await prisma.stockRequisitionLine.update({
          where: { id: line.id },
          data: { qtyIssued: { increment: issueLine.qtyIssued } },
        });
      }

      // Check if fully or partially issued
      const updatedLines = await prisma.stockRequisitionLine.findMany({ where: { requisitionId: id } });
      const fullyIssued = updatedLines.every(
        (l) => Number(l.qtyIssued) >= Number(l.qtyRequested)
      );
      const partiallyIssued = updatedLines.some((l) => Number(l.qtyIssued) > 0);

      await prisma.stockRequisition.update({
        where: { id },
        data: {
          status: fullyIssued ? "FULLY_ISSUED" : partiallyIssued ? "PARTIALLY_ISSUED" : "APPROVED",
        },
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
