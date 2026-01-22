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

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Allow Admin, Headmaster, or Accountant
    const allowedRoles = ["ADMIN", "HEADMASTER", "ACCOUNTANT"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      bankName, 
      accountNumber, 
      currencyCode, 
      glAccountCode,
      glAccountName,
      glAccountType = "ASSET"
    } = body;

    if (!bankName || !accountNumber || !currencyCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Start a transaction to create both Account and BankAccount
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or find the GL Account
      let account;
      if (glAccountCode) {
        account = await tx.account.findUnique({
          where: {
            organisationId_code: {
              organisationId: user.organisationId,
              code: glAccountCode,
            }
          }
        });
      }

      if (!account) {
        // Create new GL account if not found
        // Use bank name and account number as defaults if not provided
        const code = glAccountCode || `BANK-${accountNumber.slice(-4)}`;
        const name = glAccountName || `${bankName} (${accountNumber})`;
        
        account = await tx.account.create({
          data: {
            organisationId: user.organisationId,
            code,
            name,
            type: glAccountType,
            isCashAccount: true,
            isSystemAccount: false,
          }
        });
      }

      // 2. Create the BankAccount
      const bankAccount = await tx.bankAccount.create({
        data: {
          organisationId: user.organisationId,
          accountId: account.id,
          bankName,
          accountNumber,
          currencyCode,
        },
        include: {
          account: true
        }
      });

      return bankAccount;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A bank account with this account number or GL code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
