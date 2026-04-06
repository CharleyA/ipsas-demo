import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";
import { InventoryMovementService } from "@/lib/services/inventory.service";

function cuidLike() {
  return `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const sessionRows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT s.*, u."firstName", u."lastName"
        FROM stock_take_sessions s
        LEFT JOIN users u ON u.id = s."createdById"
        WHERE s.id = $1 AND s."organisationId" = $2
      `, sessionId, authReq.user.organisationId);
      const session = sessionRows[0];
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const lines = await prisma.$queryRawUnsafe<any[]>(`
        SELECT l.*, i.code, i.name, i."unitOfMeasure", c.name AS "categoryName"
        FROM stock_take_lines l
        JOIN inventory_items i ON i.id = l."itemId"
        LEFT JOIN inventory_categories c ON c.id = i."categoryId"
        WHERE l."sessionId" = $1
        ORDER BY i.code ASC
      `, sessionId);

      return NextResponse.json({ session, lines });
    }

    const sessions = await prisma.$queryRawUnsafe<any[]>(`
      SELECT s.*, u."firstName", u."lastName",
        COALESCE((SELECT COUNT(*) FROM stock_take_lines l WHERE l."sessionId" = s.id), 0) AS "lineCount"
      FROM stock_take_sessions s
      LEFT JOIN users u ON u.id = s."createdById"
      WHERE s."organisationId" = $1
      ORDER BY s."createdAt" DESC
      LIMIT 50
    `, authReq.user.organisationId);

    const items = await prisma.inventoryItem.findMany({
      where: { organisationId: authReq.user.organisationId, isActive: true },
      include: { category: true },
      orderBy: [{ code: "asc" }],
    });

    return NextResponse.json({ sessions, items });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      const action = body?.action || "save";

      if (action === "save") {
        const { sessionId, reference, countDate, notes, lines } = body || {};
        if (!reference || !countDate || !Array.isArray(lines)) {
          return NextResponse.json({ error: "reference, countDate and lines are required" }, { status: 400 });
        }

        const id = sessionId || cuidLike();
        const existing = sessionId
          ? await prisma.$queryRawUnsafe<any[]>(`SELECT id, status FROM stock_take_sessions WHERE id = $1 AND "organisationId" = $2`, sessionId, authReq.user.organisationId)
          : [];
        const current = existing[0];
        if (current && current.status === 'POSTED') {
          return NextResponse.json({ error: 'Posted stock take sessions cannot be edited' }, { status: 400 });
        }

        if (current) {
          await prisma.$executeRawUnsafe(`
            UPDATE stock_take_sessions
            SET reference = $1, "countDate" = $2::date, notes = $3, status = 'COUNTED', "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $4 AND "organisationId" = $5
          `, reference, countDate, notes || null, id, authReq.user.organisationId);
          await prisma.$executeRawUnsafe(`DELETE FROM stock_take_lines WHERE "sessionId" = $1`, id);
        } else {
          await prisma.$executeRawUnsafe(`
            INSERT INTO stock_take_sessions (id, "organisationId", reference, "countDate", status, notes, "createdById")
            VALUES ($1, $2, $3, $4::date, 'COUNTED', $5, $6)
          `, id, authReq.user.organisationId, reference, countDate, notes || null, authReq.user.userId);
        }

        for (const line of lines) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO stock_take_lines (id, "sessionId", "itemId", "systemQty", "physicalQty", variance, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, cuidLike(), id, line.itemId, Number(line.systemQty || 0), Number(line.physicalQty || 0), Number(line.variance || 0), line.notes || null);
        }

        return NextResponse.json({ success: true, sessionId: id });
      }

      if (action === "approve") {
        const { sessionId } = body || {};
        const approverRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM organisation_users WHERE "organisationId" = $1 AND "userId" = $2 AND "isApprover" = true AND "isActive" = true`, authReq.user.organisationId, authReq.user.userId);
        if (!approverRows[0]) return NextResponse.json({ error: "Only approvers can approve stock take sessions" }, { status: 403 });

        await prisma.$executeRawUnsafe(`
          UPDATE stock_take_sessions
          SET status = 'APPROVED', "approvedById" = $1, "approvedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = $2 AND "organisationId" = $3 AND status IN ('COUNTED','DRAFT')
        `, authReq.user.userId, sessionId, authReq.user.organisationId);

        return NextResponse.json({ success: true, sessionId, status: 'APPROVED' });
      }

      if (action === "post") {
        const { sessionId } = body || {};
        const sessions = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM stock_take_sessions WHERE id = $1 AND "organisationId" = $2`, sessionId, authReq.user.organisationId);
        const session = sessions[0];
        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
        if (session.status !== 'APPROVED') return NextResponse.json({ error: "Session must be approved before posting" }, { status: 400 });

        const lines = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM stock_take_lines WHERE "sessionId" = $1`, sessionId);
        let posted = 0;
        for (const line of lines) {
          const variance = Number(line.variance || 0);
          if (!variance) continue;
          const movement = await InventoryMovementService.createAdjustment(
            {
              organisationId: authReq.user.organisationId,
              itemId: line.itemId,
              movementDate: session.countDate,
              quantity: variance,
              referenceType: 'STOCK_COUNT',
              referenceId: session.reference,
              notes: line.notes || `Stock take variance ${line.systemQty} -> ${line.physicalQty}`,
            },
            authReq.user.userId
          );
          await prisma.$executeRawUnsafe(`UPDATE stock_take_lines SET "postedMovementId" = $1 WHERE id = $2`, movement.id, line.id);
          posted += 1;
        }

        await prisma.$executeRawUnsafe(`
          UPDATE stock_take_sessions
          SET status = 'POSTED', "postedById" = $1, "postedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = $2 AND "organisationId" = $3
        `, authReq.user.userId, sessionId, authReq.user.organisationId);

        return NextResponse.json({ success: true, sessionId, posted, status: 'POSTED' });
      }

      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
