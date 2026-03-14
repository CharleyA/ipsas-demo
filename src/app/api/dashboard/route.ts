import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { withAuth } from "@/lib/middleware-utils";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { organisationId, role } = authReq.user;

    try {
      if (role === "HEADMASTER" || role === "ADMIN") {
        const metrics = await DashboardService.getHeadmasterMetrics(organisationId);
        return NextResponse.json(metrics);
      } else if (role === "AUDITOR") {
        const metrics = await DashboardService.getAuditorMetrics(organisationId);
        return NextResponse.json(metrics);
      } else if (role === "ACCOUNTANT" || role === "BURSAR") {
        const metrics = await DashboardService.getAccountantMetrics(organisationId);
        return NextResponse.json(metrics);
      } else {
        return NextResponse.json({ message: "Welcome to IPSAS Accounting" });
      }
    } catch (error: any) {
      console.error("Dashboard API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}
