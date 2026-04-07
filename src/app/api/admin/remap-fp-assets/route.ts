import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });

    const organisationId = auth.organisationId;

    const targetCodes = ["FP-PPE", "FP-NON-CURR-ASSETS"];
    const lines = await prisma.statementLine.findMany({
      where: { organisationId, reportType: "FINANCIAL_POSITION", code: { in: targetCodes } },
      select: { id: true, code: true }
    });
    const lineMap = Object.fromEntries(lines.map(l => [l.code, l.id]));

    await prisma.accountStatementMap.deleteMany({ where: { statementLineId: { in: lines.map(l => l.id) } } });

    // Gross PPE only here. Keep accumulated depreciation out of direct PPE mapping for now
    // so the statement stops netting everything to zero without a dedicated contra line.
    const grossPpeAccounts = await prisma.account.findMany({
      where: { organisationId, code: { in: ["1210", "1211", "1212", "1500"] } },
      select: { id: true, code: true }
    });

    let created = 0;
    for (const acc of grossPpeAccounts) {
      await prisma.accountStatementMap.create({
        data: { accountId: acc.id, statementLineId: lineMap["FP-PPE"] }
      });
      created++;
    }

    return NextResponse.json({
      message: "Financial Position asset lines remapped",
      summary: {
        createdMappings: created,
        grossPpeCodes: grossPpeAccounts.map(a => a.code)
      }
    });
  } catch (error: any) {
    console.error("Remap FP Assets Error:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
