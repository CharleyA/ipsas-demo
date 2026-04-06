import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const sessionId = searchParams.get("sessionId");
    const orgId = authReq.user.organisationId;

    const sessionWhere: any = {
      organisationId: orgId,
      status: "POSTED",
    };
    if (fromDate) sessionWhere.countDate = { ...sessionWhere.countDate, gte: new Date(fromDate) };
    if (toDate) sessionWhere.countDate = { ...sessionWhere.countDate, lte: new Date(toDate) };
    if (sessionId) sessionWhere.id = sessionId;

    const lines = await prisma.stockTakeLine.findMany({
      where: {
        session: sessionWhere,
        NOT: { variance: 0 },
      },
      include: {
        item: {
          include: { category: true },
        },
        session: {
          select: { id: true, reference: true, countDate: true, status: true },
        },
      },
      orderBy: [{ session: { countDate: "desc" } }, { item: { code: "asc" } }],
    });

    const rows = lines.map((line) => {
      const variance = Number(line.variance);
      const avgCost = Number(line.item.averageCost ?? 0);
      const valueImpact = variance * avgCost;
      return {
        id: line.id,
        sessionId: line.session.id,
        sessionRef: line.session.reference,
        countDate: line.session.countDate,
        itemId: line.item.id,
        itemCode: line.item.code,
        itemName: line.item.name,
        uom: line.item.unitOfMeasure,
        category: line.item.category?.name ?? "—",
        systemQty: Number(line.systemQty),
        physicalQty: Number(line.physicalQty),
        variance,
        avgCost,
        valueImpact,
        notes: line.notes ?? null,
      };
    });

    const totalPositive = rows.filter((r) => r.variance > 0).reduce((s, r) => s + r.variance, 0);
    const totalNegative = rows.filter((r) => r.variance < 0).reduce((s, r) => s + r.variance, 0);
    const totalValueImpact = rows.reduce((s, r) => s + r.valueImpact, 0);
    const totalPositiveValue = rows.filter((r) => r.valueImpact > 0).reduce((s, r) => s + r.valueImpact, 0);
    const totalNegativeValue = rows.filter((r) => r.valueImpact < 0).reduce((s, r) => s + r.valueImpact, 0);

    // Sessions for filter dropdown
    const sessions = await prisma.stockTakeSession.findMany({
      where: { organisationId: orgId, status: "POSTED" },
      select: { id: true, reference: true, countDate: true },
      orderBy: { countDate: "desc" },
    });

    return NextResponse.json({
      rows,
      summary: {
        totalVarianceLines: rows.length,
        totalPositive,
        totalNegative,
        totalValueImpact,
        totalPositiveValue,
        totalNegativeValue,
      },
      sessions,
    });
  });
}
