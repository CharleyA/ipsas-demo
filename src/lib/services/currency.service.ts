import prisma from "@/lib/db";
import type { CreateCurrencyInput, CreateExchangeRateInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";
import { Prisma } from "@prisma/client";

export class CurrencyService {
  static async create(data: CreateCurrencyInput, actorId: string) {
    const currency = await prisma.currency.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals ?? 2,
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "CREATE",
      entityType: "Currency",
      entityId: currency.id,
      newValues: currency,
    });

    return currency;
  }

  static async findByCode(code: string) {
    return prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  static async list(activeOnly = true) {
    return prisma.currency.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { code: "asc" },
    });
  }

  static async createExchangeRate(data: CreateExchangeRateInput, actorId: string) {
    const rate = await prisma.exchangeRate.create({
      data: {
        fromCurrencyCode: data.fromCurrencyCode.toUpperCase(),
        toCurrencyCode: data.toCurrencyCode.toUpperCase(),
        rate: new Prisma.Decimal(data.rate),
        effectiveDate: new Date(data.effectiveDate),
        source: data.source,
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "CREATE",
      entityType: "ExchangeRate",
      entityId: rate.id,
      newValues: rate,
    });

    return rate;
  }

  static async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date()
  ) {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return { rate: 1, effectiveDate: date };
    }

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyCode: fromCurrency.toUpperCase(),
        toCurrencyCode: toCurrency.toUpperCase(),
        effectiveDate: { lte: date },
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (!rate) {
      const inverseRate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrencyCode: toCurrency.toUpperCase(),
          toCurrencyCode: fromCurrency.toUpperCase(),
          effectiveDate: { lte: date },
        },
        orderBy: { effectiveDate: "desc" },
      });

      if (inverseRate) {
        return {
          rate: 1 / Number(inverseRate.rate),
          effectiveDate: inverseRate.effectiveDate,
        };
      }
    }

    return rate ? { rate: Number(rate.rate), effectiveDate: rate.effectiveDate } : null;
  }

  static async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date()
  ) {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    
    if (!exchangeRate) {
      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    }

    return {
      originalAmount: amount,
      convertedAmount: amount * exchangeRate.rate,
      rate: exchangeRate.rate,
      effectiveDate: exchangeRate.effectiveDate,
    };
  }

  static async listExchangeRates(options?: {
    fromCurrency?: string;
    toCurrency?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (options?.fromCurrency) where.fromCurrencyCode = options.fromCurrency.toUpperCase();
    if (options?.toCurrency) where.toCurrencyCode = options.toCurrency.toUpperCase();

    if (options?.startDate || options?.endDate) {
      where.effectiveDate = {};
      if (options.startDate) (where.effectiveDate as Record<string, unknown>).gte = options.startDate;
      if (options.endDate) (where.effectiveDate as Record<string, unknown>).lte = options.endDate;
    }

    return prisma.exchangeRate.findMany({
      where,
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: { effectiveDate: "desc" },
      take: options?.limit ?? 100,
    });
  }

  static async seedDefaultCurrencies(actorId: string) {
    const defaultCurrencies = [
      { code: "ZWG", name: "Zimbabwe Gold", symbol: "ZWG", decimals: 2 },
      { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
      { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2 },
      { code: "BWP", name: "Botswana Pula", symbol: "P", decimals: 2 },
      { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
      { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
    ];

    const created = await prisma.currency.createMany({
      data: defaultCurrencies,
      skipDuplicates: true,
    });

    await AuditService.log({
      userId: actorId,
      action: "SEED_CURRENCIES",
      entityType: "Currency",
      entityId: "bulk",
      newValues: { count: created.count },
    });

    return prisma.currency.findMany({
      where: { code: { in: defaultCurrencies.map(c => c.code) } },
    });
  }
}
