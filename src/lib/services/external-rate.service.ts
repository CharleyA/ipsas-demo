import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export class ExternalRateService {
  private static readonly ZIMRATE_API_URL = "https://zimrate.tyganeutronics.com/api";

  /**
   * Fetches latest rates from ZimRate API (aggregates RBZ and other sources)
   */
  static async fetchLatestRates() {
    try {
      const response = await fetch(this.ZIMRATE_API_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch rates: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseZimRateData(data);
    } catch (error) {
      console.error("Error fetching external rates:", error);
      return null;
    }
  }

  /**
   * Parses ZimRate API response to extract RBZ rates
   */
  private static parseZimRateData(data: any[]) {
    // ZimRate returns an array of sources. We want the one where source is 'rbz' or similar.
    // Usually it has 'rbz_interbank' or 'rbz'.
    const rbzData = data.find((item: any) => 
      item.source?.toLowerCase().includes("rbz") || 
      item.name?.toLowerCase().includes("rbz")
    );

    if (!rbzData || !rbzData.rate) {
      // Fallback to searching for the one with the highest reliability or just the first one if RBZ not found
      // But for this requirement, we specifically want RBZ.
      return null;
    }

    return {
      rate: parseFloat(rbzData.rate),
      source: `RBZ (${rbzData.source || 'Official'})`,
      date: rbzData.date ? new Date(rbzData.date) : new Date(),
    };
  }

  /**
   * Syncs RBZ rates for ZWG/USD to the database
   */
  static async syncRBZRate(actorId: string) {
    const rateInfo = await this.fetchLatestRates();
    if (!rateInfo) {
      throw new Error("Could not retrieve RBZ rates at this time.");
    }

    // We assume the rate is USD to ZWG (or ZiG)
    // ZimRate usually provides ZWG per 1 USD
    
    const effectiveDate = new Date();
    effectiveDate.setHours(0, 0, 0, 0);

    // Update or create exchange rate
    const rate = await prisma.exchangeRate.upsert({
      where: {
        fromCurrencyCode_toCurrencyCode_effectiveDate: {
          fromCurrencyCode: "USD",
          toCurrencyCode: "ZWG",
          effectiveDate: effectiveDate,
        },
      },
      update: {
        rate: new Prisma.Decimal(rateInfo.rate),
        source: rateInfo.source,
      },
      create: {
        fromCurrencyCode: "USD",
        toCurrencyCode: "ZWG",
        rate: new Prisma.Decimal(rateInfo.rate),
        effectiveDate: effectiveDate,
        source: rateInfo.source,
      },
    });

    return rate;
  }
}
