import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { AssetService } from "@/lib/services/asset.service";

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await req.json();
      // body.rows: array of asset rows from CSV parse
      const rows: any[] = body.rows || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: "No rows provided" }, { status: 400 });
      }

      const results: { row: number; success: boolean; assetNumber?: string; error?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const asset = await AssetService.create(
            {
              organisationId: authReq.user.organisationId,
              categoryId: row.categoryId,
              description: row.description,
              serialNumber: row.serialNumber || undefined,
              location: row.location || undefined,
              custodian: row.custodian || undefined,
              acquisitionDate: row.acquisitionDate,
              acquisitionCost: parseFloat(row.acquisitionCost),
            },
            authReq.user.userId
          );
          results.push({ row: i + 1, success: true, assetNumber: asset.assetNumber });
        } catch (e: any) {
          results.push({ row: i + 1, success: false, error: e.message });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return NextResponse.json({ succeeded, failed, results });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  });
}
