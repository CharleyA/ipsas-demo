import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.bankAccount.findMany({
      where: { organisationId: user.organisationId },
      include: {
        account: true,
      },
    });

    // For each account, get the current GL balance
    const accountsWithBalance = await Promise.all(
      accounts.map(async (acc) => {
        const glEntries = await prisma.gLEntry.aggregate({
          where: {
            accountId: acc.accountId,
            glHeader: { organisationId: user.organisationId }
          },
          _sum: {
            debitLc: true,
            creditLc: true
          }
        });

        const balance = (glEntries._sum.debitLc || 0) - (glEntries._sum.creditLc || 0);
        return {
          ...acc,
          _balance: balance
        };
      })
    );

    return NextResponse.json(accountsWithBalance);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
