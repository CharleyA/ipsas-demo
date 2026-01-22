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
    // We prioritize "interbank" or "mid" or "average" rates as requested.
    
    // Sort to prioritize "interbank", "mid", "average"
    const sortedData = [...data].sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      const aSource = (a.source || "").toLowerCase();
      const bSource = (b.source || "").toLowerCase();

      const isMid = (s: string) => s.includes("mid") || s.includes("average") || s.includes("avg") || s.includes("interbank");
      
      const aIsMid = isMid(aName) || isMid(aSource);
      const bIsMid = isMid(bName) || isMid(bSource);

      if (aIsMid && !bIsMid) return -1;
      if (!aIsMid && bIsMid) return 1;
      return 0;
    });

    const rbzData = sortedData.find((item: any) => 
      item.currency?.toLowerCase() === "rbz" ||
      item.source?.toLowerCase().includes("rbz") || 
      item.name?.toLowerCase().includes("rbz") ||
      item.name?.toLowerCase().includes("reserve bank")
    );

    if (!rbzData || !rbzData.rate) {
      return null;
    }

    return {
      rate: parseFloat(rbzData.rate),
      source: `RBZ (${rbzData.name || rbzData.source || "Interbank"})`,
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
