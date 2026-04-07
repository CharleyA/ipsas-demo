import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { VoucherService } from "@/lib/services/voucher.service";
import { AccountService } from "@/lib/services/account.service";

function d(year: number, month: number, day = 28) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;
    const actorId = auth.userId;

    const org = await prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

    const getAccount = async (code: string, name: string, type: any) => {
      let acc = await prisma.account.findUnique({ where: { organisationId_code: { organisationId, code } } });
      if (!acc) {
        acc = await AccountService.create({ organisationId, code, name, type, isSystemAccount: true }, actorId);
      }
      return acc;
    };

    const accounts = {
      cash1112: await getAccount("1112", "Main Bank Account", "ASSET"),
      petty1111: await getAccount("1111", "Petty Cash", "ASSET"),
      recv1121: await getAccount("1121", "Fees Receivable", "ASSET"),
      recv1121usd: await getAccount("1121.USD", "Fees Receivable - USD", "ASSET"),
      recv1121zwg: await getAccount("1121.ZWG", "Fees Receivable - ZWG", "ASSET"),
      ppe1210: await getAccount("1210", "Property, Plant and Equipment", "ASSET"),
      accumDep1600: await getAccount("1600", "Accumulated Depreciation", "ASSET"),
      pay2111: await getAccount("2111", "Trade Payables", "LIABILITY"),
      pay2111usd: await getAccount("2111.USD", "Trade Payables - USD", "LIABILITY"),
      pay2111zwg: await getAccount("2111.ZWG", "Trade Payables - ZWG", "LIABILITY"),
      equity3100: await getAccount("3100", "Accumulated Surpluses", "NET_ASSETS_EQUITY"),
      reserve3200: await getAccount("3200", "Reserves", "NET_ASSETS_EQUITY"),
      revenue4100: await getAccount("4100", "Grant and Non-Exchange Revenue", "REVENUE"),
      revenue4210: await getAccount("4210", "Rendering of Services (Fees)", "REVENUE"),
      revenue4210usd: await getAccount("4210.USD", "Fees Revenue - USD", "REVENUE"),
      revenue4210zwg: await getAccount("4210.ZWG", "Fees Revenue - ZWG", "REVENUE"),
      salaries5100: await getAccount("5100", "Wages and Salaries", "EXPENSE"),
      supplies5200: await getAccount("5200", "Supplies and Consumables", "EXPENSE"),
      depreciation5300: await getAccount("5300", "Depreciation", "EXPENSE"),
      other5400: await getAccount("5400", "Other Expenses", "EXPENSE"),
    };

    await prisma.organisation.update({
      where: { id: organisationId },
      data: {
        arReceivableAccountId: accounts.recv1121.id,
        arRevenueAccountId: accounts.revenue4210.id,
        arBankAccountId: accounts.cash1112.id,
        apPayableAccountId: accounts.pay2111.id,
        apExpenseAccountId: accounts.other5400.id,
        apBankAccountId: accounts.cash1112.id,
        cashInHandAccountId: accounts.petty1111.id,
      }
    });

    let bankAccount = await prisma.bankAccount.findFirst({ where: { organisationId, accountId: accounts.cash1112.id } });
    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          organisationId,
          accountId: accounts.cash1112.id,
          bankName: "Standard Bank",
          accountNumber: "1234567890",
          currencyCode: org.baseCurrency || "ZWG"
        }
      });
    }

    for (let year = 2024; year <= 2026; year++) {
      await prisma.fiscalPeriod.upsert({
        where: { organisationId_year_period: { organisationId, year, period: 1 } },
        update: {},
        create: {
          organisationId,
          year,
          period: 1,
          name: `FY ${year}`,
          startDate: d(year, 1, 1),
          endDate: d(year, 12, 31),
          status: year < 2026 ? "OPEN" : "OPEN"
        }
      });
    }

    const fundGeneral = await prisma.fund.upsert({
      where: { organisationId_code: { organisationId, code: "GEN" } },
      update: {},
      create: { organisationId, code: "GEN", name: "General Fund" }
    });
    const fundDev = await prisma.fund.upsert({
      where: { organisationId_code: { organisationId, code: "DEV" } },
      update: {},
      create: { organisationId, code: "DEV", name: "Development Fund" }
    });

    const ccAdmin = await prisma.costCentre.upsert({
      where: { organisationId_code: { organisationId, code: "ADMIN" } },
      update: {},
      create: { organisationId, code: "ADMIN", name: "Administration" }
    });
    const ccAcad = await prisma.costCentre.upsert({
      where: { organisationId_code: { organisationId, code: "ACAD" } },
      update: {},
      create: { organisationId, code: "ACAD", name: "Academic Department" }
    });
    const ccMaint = await prisma.costCentre.upsert({
      where: { organisationId_code: { organisationId, code: "MAINT" } },
      update: {},
      create: { organisationId, code: "MAINT", name: "Maintenance & Facilities" }
    });

    for (let year = 2024; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const effectiveDate = d(year, month, 1);
        const rate = year === 2024 ? 3500 + (month - 1) * 100 : 4700 + (month - 1) * 150;
        await prisma.exchangeRate.upsert({
          where: { fromCurrencyCode_toCurrencyCode_effectiveDate: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG", effectiveDate } },
          update: { rate },
          create: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG", effectiveDate, rate, source: "History Seed" }
        });
      }
    }

    const seedMarkerPrefix = "HIST-";
    const existing = await prisma.voucher.count({ where: { organisationId, number: { startsWith: seedMarkerPrefix } } });
    if (existing > 0) {
      return NextResponse.json({
        message: "Historical demo data already present",
        summary: { existingHistoricalVouchers: existing }
      });
    }

    let counter = 1;
    const nextRef = (slug: string, year: number, month: number) => `${seedMarkerPrefix}${slug}-${year}${String(month).padStart(2, "0")}-${String(counter++).padStart(4, "0")}`;

    const postVoucher = async (opts: {
      year: number;
      month: number;
      description: string;
      lines: any[];
      date?: Date;
    }) => {
      const date = opts.date || d(opts.year, opts.month, 28);
      const period = await prisma.fiscalPeriod.findUnique({ where: { organisationId_year_period: { organisationId, year: opts.year, period: 1 } } });
      if (!period) throw new Error(`Missing fiscal period for ${opts.year}`);

      const voucher = await VoucherService.create({
        organisationId,
        type: "JOURNAL",
        periodId: period.id,
        date,
        description: opts.description,
        reference: nextRef("JV", opts.year, opts.month),
        lines: opts.lines,
      }, actorId);

      await VoucherService.submit(voucher.id, actorId);
      await VoucherService.approve(voucher.id, actorId);
      await VoucherService.post(voucher.id, actorId, true);
      return voucher;
    };

    let vouchersCreated = 0;

    for (let year = 2024; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const feeRevenue = 2200000 + (month * 50000) + (year === 2025 ? 250000 : 0);
        const salaries = 1400000 + (month * 25000) + (year === 2025 ? 150000 : 0);
        const supplies = 180000 + (month * 8000);
        const other = 120000 + (month * 5000);
        const depreciation = 95000;
        const grantRevenue = month % 6 === 0 ? 500000 : 0;
        const fxRate = year === 2024 ? 3500 + (month - 1) * 100 : 4700 + (month - 1) * 150;
        const usdFee = 180 + (month % 3) * 20;

        await postVoucher({
          year, month,
          description: `Historical fees billing ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.recv1121zwg.id, description: "Fees billed", currencyCode: "ZWG", debit: feeRevenue, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
            { lineNumber: 2, accountId: accounts.revenue4210zwg.id, description: "Fees revenue", currencyCode: "ZWG", credit: feeRevenue, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
          ]
        });
        vouchersCreated++;

        const collections = Math.round(feeRevenue * 0.82);
        await postVoucher({
          year, month,
          description: `Historical collections ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.cash1112.id, description: "Collections banked", currencyCode: "ZWG", debit: collections, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
            { lineNumber: 2, accountId: accounts.recv1121zwg.id, description: "Receivable cleared", currencyCode: "ZWG", credit: collections, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical salaries ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.salaries5100.id, description: "Salary expense", currencyCode: "ZWG", debit: salaries, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
            { lineNumber: 2, accountId: accounts.cash1112.id, description: "Salary payment", currencyCode: "ZWG", credit: salaries, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical supplies bill ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.supplies5200.id, description: "Supplies expense", currencyCode: "ZWG", debit: supplies, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAcad.id },
            { lineNumber: 2, accountId: accounts.pay2111zwg.id, description: "Supplies payable", currencyCode: "ZWG", credit: supplies, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAcad.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical payable settlement ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.pay2111zwg.id, description: "Payable settled", currencyCode: "ZWG", debit: Math.round(supplies * 0.9), fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAcad.id },
            { lineNumber: 2, accountId: accounts.cash1112.id, description: "Cash paid", currencyCode: "ZWG", credit: Math.round(supplies * 0.9), fxRate: 1, fundId: fundGeneral.id, costCentreId: ccAcad.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical other expenses ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.other5400.id, description: "Other expense", currencyCode: "ZWG", debit: other, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccMaint.id },
            { lineNumber: 2, accountId: accounts.cash1112.id, description: "Cash payment", currencyCode: "ZWG", credit: other, fxRate: 1, fundId: fundGeneral.id, costCentreId: ccMaint.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical depreciation ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.depreciation5300.id, description: "Depreciation", currencyCode: "ZWG", debit: depreciation, fxRate: 1, fundId: fundDev.id, costCentreId: ccMaint.id },
            { lineNumber: 2, accountId: accounts.accumDep1600.id, description: "Accumulated depreciation", currencyCode: "ZWG", credit: depreciation, fxRate: 1, fundId: fundDev.id, costCentreId: ccMaint.id },
          ]
        });
        vouchersCreated++;

        if (grantRevenue > 0) {
          await postVoucher({
            year, month,
            description: `Historical grant funding ${year}-${String(month).padStart(2, "0")}`,
            lines: [
              { lineNumber: 1, accountId: accounts.cash1112.id, description: "Grant received", currencyCode: "ZWG", debit: grantRevenue, fxRate: 1, fundId: fundDev.id, costCentreId: ccAdmin.id },
              { lineNumber: 2, accountId: accounts.revenue4100.id, description: "Grant income", currencyCode: "ZWG", credit: grantRevenue, fxRate: 1, fundId: fundDev.id, costCentreId: ccAdmin.id },
            ]
          });
          vouchersCreated++;
        }

        await postVoucher({
          year, month,
          description: `Historical USD boarding fees ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.recv1121usd.id, description: "USD fees receivable", currencyCode: "USD", debit: usdFee, fxRate, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
            { lineNumber: 2, accountId: accounts.revenue4210usd.id, description: "USD fees revenue", currencyCode: "USD", credit: usdFee, fxRate, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
          ]
        });
        vouchersCreated++;

        await postVoucher({
          year, month,
          description: `Historical USD fee collections ${year}-${String(month).padStart(2, "0")}`,
          lines: [
            { lineNumber: 1, accountId: accounts.cash1112.id, description: "USD cash collection", currencyCode: "USD", debit: usdFee, fxRate, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
            { lineNumber: 2, accountId: accounts.recv1121usd.id, description: "USD receivable cleared", currencyCode: "USD", credit: usdFee, fxRate, fundId: fundGeneral.id, costCentreId: ccAdmin.id },
          ]
        });
        vouchersCreated++;
      }
    }

    const histCount = await prisma.voucher.count({ where: { organisationId, number: { startsWith: seedMarkerPrefix } } });
    return NextResponse.json({
      message: "Historical demo data generated successfully",
      summary: {
        vouchersCreated,
        historicalVoucherCount: histCount,
        range: "2024-01 to 2025-12"
      }
    });
  } catch (error: any) {
    console.error("Seed History Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
