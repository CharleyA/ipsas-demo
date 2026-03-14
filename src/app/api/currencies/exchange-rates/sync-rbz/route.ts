import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { ExternalRateService } from "@/lib/services/external-rate.service";

export async function POST(req: NextRequest) {
  try {
    const authContext = await verifyAuth(req);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check - usually only Admin or Accountant should sync rates
    if (!["ADMIN", "ACCOUNTANT", "BURSAR"].includes(authContext.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rate = await ExternalRateService.syncRBZRate(authContext.userId);

    return NextResponse.json({ 
      success: true, 
      rate: Number(rate.rate),
      effectiveDate: rate.effectiveDate,
      source: rate.source
    });
  } catch (error: any) {
    console.error("RBZ Sync Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync RBZ rates" },
      { status: 500 }
    );
  }
}
