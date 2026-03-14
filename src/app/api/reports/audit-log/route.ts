import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async (authReq) => {
      const { searchParams } = new URL(authReq.url);
      const format = (searchParams.get("format") || "json") as ExportFormat;
      const filters = {
        userId: searchParams.get("userId") || undefined,
        entityType: searchParams.get("entityType") || undefined,
        entityId: searchParams.get("entityId") || undefined,
        action: searchParams.get("action") || undefined,
        startDate: searchParams.get("startDate")
          ? new Date(searchParams.get("startDate")!)
          : undefined,
        endDate: searchParams.get("endDate")
          ? new Date(searchParams.get("endDate")!)
          : undefined,
      };

      const logs = await ReportService.getAuditLog(authReq.user.organisationId, filters);

      if (format === "json") {
        return NextResponse.json(logs);
      }

      const columns: ExportColumn[] = [
        { header: "Timestamp", key: "createdAt" },
        { header: "User", key: "userId" },
        { header: "Action", key: "action" },
        { header: "Entity", key: "entityType" },
        { header: "Entity ID", key: "entityId" },
      ];

      // Flatten logs for export
      const data = logs.map((log: any) => ({
        ...log,
        userId: `${log.user.firstName} ${log.user.lastName} (${log.user.email})`,
      }));

      const content = await ReportExporter.export(format, data, columns, "Audit Log");
      return ReportExporter.getResponse(format, content, "Audit Log");
    },
    ["ADMIN", "AUDITOR"]
  );
}
