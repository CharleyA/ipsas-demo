import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;

    const lineCodes = [
      "FP-CASH",
      "FP-RECEIVABLES",
      "FP-PPE",
      "FP-PAYABLES",
      "FP-ACC-SURPLUS",
      "FP-RESERVES",
    ];

    const lines = await prisma.statementLine.findMany({
      where: { organisationId, reportType: "FINANCIAL_POSITION", code: { in: lineCodes } },
      select: { id: true, code: true }
    });
    const lineMap = Object.fromEntries(lines.map(l => [l.code, l.id]));

    await prisma.accountStatementMap.deleteMany({ where: { statementLineId: { in: lines.map(l => l.id) } } });

    const wanted: Record<string, string[]> = {
      "FP-CASH": ["1110", "1111", "1112"],
      "FP-RECEIVABLES": ["1120", "1121", "1121.USD", "1121.ZWG"],
      "FP-PPE": ["1210", "1211", "1212", "1600"],
      "FP-PAYABLES": ["2110", "2111", "2111.USD", "2111.ZWG"],
      "FP-ACC-SURPLUS": ["3100"],
      "FP-RESERVES": ["3200"],
    };

    let created = 0;
    for (const [lineCode, accountCodes] of Object.entries(wanted)) {
      const statementLineId = lineMap[lineCode];
      if (!statementLineId) continue;
      const accounts = await prisma.account.findMany({
        where: { organisationId, code: { in: accountCodes } },
        select: { id: true, code: true }
      });
      for (const acc of accounts) {
        await prisma.accountStatementMap.create({
          data: { accountId: acc.id, statementLineId }
        });
        created++;
      }
    }

    return NextResponse.json({
      message: "Financial Position core lines remapped",
      summary: { createdMappings: created }
    });
  } catch (error: any) {
    console.error("Remap FP Core Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
