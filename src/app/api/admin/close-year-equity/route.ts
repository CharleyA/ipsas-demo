import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { VoucherService } from "@/lib/services/voucher.service";
import { ReportService } from "@/lib/services/report.service";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const year = Number(body.year);
    if (!year || Number.isNaN(year)) {
      return NextResponse.json({ error: "Valid year is required" }, { status: 400 });
    }

    const organisationId = auth.organisationId;
    const actorId = auth.userId;

    const period = await prisma.fiscalPeriod.findUnique({
      where: { organisationId_year_period: { organisationId, year, period: 1 } }
    });
    if (!period) {
      return NextResponse.json({ error: `Fiscal period for ${year} not found` }, { status: 404 });
    }

    const equity = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "3100" } } });
    const feesRevenue = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code: "4210.ZWG" } } });
    if (!equity || !feesRevenue) {
      return NextResponse.json({ error: "Required accounts missing (3100, 4210.ZWG)" }, { status: 400 });
    }

    const existing = await prisma.voucher.findFirst({
      where: {
        organisationId,
        reference: `YEAR-END-CLOSE-${year}`
      },
      select: { id: true, number: true, status: true }
    });
    if (existing) {
      return NextResponse.json({
        message: "Year-end equity close already posted",
        summary: existing
      });
    }

    const report = await ReportService.getFinancialPerformance(
      organisationId,
      new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
      new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      { reportingCurrency: "ZWG" }
    );

    const surplus = Number(report.summary?.surplus || 0);
    if (!Number.isFinite(surplus) || surplus <= 0) {
      return NextResponse.json({
        message: "No positive surplus available to close into equity",
        summary: { year, surplus }
      });
    }

    const voucher = await VoucherService.create({
      organisationId,
      type: "JOURNAL",
      periodId: period.id,
      date: new Date(Date.UTC(year, 11, 30, 12, 0, 0)),
      description: `Year-end close of surplus to accumulated surpluses for ${year}`,
      reference: `YEAR-END-CLOSE-${year}`,
      lines: [
        {
          lineNumber: 1,
          accountId: feesRevenue.id,
          description: `Close current year surplus (${year})`,
          currencyCode: "ZWG",
          debit: surplus,
          fxRate: 1,
        },
        {
          lineNumber: 2,
          accountId: equity.id,
          description: `Accumulated surpluses transfer (${year})`,
          currencyCode: "ZWG",
          credit: surplus,
          fxRate: 1,
        }
      ]
    }, actorId);

    await VoucherService.submit(voucher.id, actorId);
    await VoucherService.approve(voucher.id, actorId);
    await VoucherService.post(voucher.id, actorId, true);

    return NextResponse.json({
      message: "Year-end equity close posted",
      summary: {
        year,
        surplus,
        voucherId: voucher.id,
      }
    });
  } catch (error: any) {
    console.error("Close Year Equity Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
