import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";
import { AuditService } from "@/lib/services/audit.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await req.json().catch(() => ({}));

      const old = await prisma.asset.findUnique({ where: { id } });
      if (!old) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (old.status !== "ACTIVE") {
        return NextResponse.json({ error: "Only ACTIVE assets can be written off" }, { status: 400 });
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          status: "WRITTEN_OFF",
          disposalDate: new Date(body.writeOffDate || new Date()),
          disposalNotes: body.reason || null,
          netBookValue: 0,
        },
      });

      await AuditService.log({
        userId: authReq.user.userId,
        organisationId: asset.organisationId,
        action: "WRITE_OFF",
        entityType: "Asset",
        entityId: id,
        oldValues: old,
        newValues: asset,
      });

      return NextResponse.json(asset);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
