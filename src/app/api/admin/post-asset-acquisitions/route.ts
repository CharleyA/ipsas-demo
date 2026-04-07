import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { VoucherService } from "@/lib/services/voucher.service";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;
    const actorId = auth.userId;

    const assets = await prisma.asset.findMany({
      where: { organisationId, status: "ACTIVE" },
      include: { category: true },
      orderBy: { acquisitionDate: "asc" }
    });

    if (assets.length === 0) {
      return NextResponse.json({ message: "No active assets found", summary: { assetsProcessed: 0 } });
    }

    const fundingAccount = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "3100" } } });
    if (!fundingAccount) {
      return NextResponse.json({ error: "Funding/equity account 3100 not found" }, { status: 400 });
    }

    let posted = 0;
    for (const asset of assets) {
      const existing = await prisma.voucher.findFirst({
        where: { organisationId, reference: `ASSET-ACQ-${asset.assetNumber}` },
        select: { id: true }
      });
      if (existing) continue;

      const assetAccountId = asset.category?.assetAccountId;
      if (!assetAccountId) continue;

      const acqDate = new Date(asset.acquisitionDate);
      const year = acqDate.getUTCFullYear();
      const period = await prisma.fiscalPeriod.findFirst({
        where: { organisationId, year },
        orderBy: { period: "asc" }
      });
      if (!period) continue;

      const amount = Number(asset.acquisitionCost || 0);
      if (!amount || amount <= 0) continue;

      const voucher = await VoucherService.create({
        organisationId,
        type: "JOURNAL",
        periodId: period.id,
        date: new Date(Date.UTC(year, acqDate.getUTCMonth(), Math.min(acqDate.getUTCDate(), 28), 12, 0, 0)),
        description: `Asset acquisition capitalization for ${asset.assetNumber}`,
        reference: `ASSET-ACQ-${asset.assetNumber}`,
        lines: [
          {
            lineNumber: 1,
            accountId: assetAccountId,
            description: `Capitalize ${asset.description}`,
            currencyCode: "ZWG",
            debit: amount,
            fxRate: 1,
          },
          {
            lineNumber: 2,
            accountId: fundingAccount.id,
            description: `Asset funding for ${asset.assetNumber}`,
            currencyCode: "ZWG",
            credit: amount,
            fxRate: 1,
          }
        ]
      }, actorId);

      await VoucherService.submit(voucher.id, actorId);
      await VoucherService.approve(voucher.id, actorId);
      await VoucherService.post(voucher.id, actorId, true);
      posted++;
    }

    return NextResponse.json({
      message: "Asset acquisition journals posted",
      summary: { assetsProcessed: assets.length, vouchersPosted: posted }
    });
  } catch (error: any) {
    console.error("Post Asset Acquisitions Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
