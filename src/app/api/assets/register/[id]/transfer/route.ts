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
      const body = await req.json();

      const old = await prisma.asset.findUnique({ where: { id } });
      if (!old) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (old.status !== "ACTIVE") {
        return NextResponse.json({ error: "Only ACTIVE assets can be transferred" }, { status: 400 });
      }

      const updateData: any = {};
      if (body.location !== undefined) updateData.location = body.location || null;
      if (body.custodian !== undefined) updateData.custodian = body.custodian || null;

      const asset = await prisma.asset.update({ where: { id }, data: updateData });

      await AuditService.log({
        userId: authReq.user.userId,
        organisationId: asset.organisationId,
        action: "TRANSFER",
        entityType: "Asset",
        entityId: id,
        oldValues: { location: old.location, custodian: old.custodian },
        newValues: { location: asset.location, custodian: asset.custodian, notes: body.notes },
      });

      return NextResponse.json(asset);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
