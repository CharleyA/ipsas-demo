import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { StatementService } from "@/lib/services/statement.service";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;
    const actorId = auth.userId;

    const targetCodes = ["FP-ACC-SURPLUS", "FP-RESERVES", "FP-PPE", "FP-PAYABLES", "FP-CASH", "FP-RECEIVABLES", "PERF-NON-EXCH", "PERF-EXCH", "PERF-WAGES", "PERF-SUPPLIES", "PERF-DEP", "PERF-OTHER"];

    const lines = await prisma.statementLine.findMany({
      where: { organisationId, code: { in: targetCodes } },
      select: { id: true }
    });

    const deleted = await prisma.accountStatementMap.deleteMany({
      where: { statementLineId: { in: lines.map(l => l.id) } }
    });

    const reseed = await StatementService.seedStatementStructure(organisationId, actorId);

    return NextResponse.json({
      message: "Statement mappings normalized successfully",
      summary: {
        deletedMappings: deleted.count,
        reseed,
      }
    });
  } catch (error: any) {
    console.error("Normalize Statement Mappings Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
