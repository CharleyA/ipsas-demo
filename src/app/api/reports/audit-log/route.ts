import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const filters = {
      userId: searchParams.get("userId") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      action: searchParams.get("action") || undefined,
      startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
      endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
    };

    const logs = await ReportService.getAuditLog(authReq.user.organisationId, filters);
    return NextResponse.json(logs);
  }, ["ADMIN", "AUDITOR"]);
}
