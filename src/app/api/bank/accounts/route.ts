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

        const balance = Number(glEntries._sum.debitLc || 0) - Number(glEntries._sum.creditLc || 0);
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
    let { 
      bankName, 
      accountNumber, 
      currencyCode, 
      glAccountCode,
      glAccountName,
      glAccountType = "ASSET"
    } = body;

    if (!bankName || !accountNumber) {
      return NextResponse.json({ error: "Bank name and account number are required" }, { status: 400 });
    }

      // Fetch organisation to get base currency if currencyCode is missing
      const organisation = await prisma.organisation.findUnique({
        where: { id: user.organisationId },
        select: { baseCurrency: true }
      });

      if (!currencyCode) {
        currencyCode = (organisation?.baseCurrency || "ZWG").trim().toUpperCase();
      } else {
        currencyCode = currencyCode.trim().toUpperCase();
      }

      // Start a transaction to create both Account and BankAccount
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create or find the GL Account
        let account;
        
        const suffix = `.${currencyCode.toLowerCase()}`;
        const defaultCode = `BANK-${accountNumber.trim().slice(-4)}${suffix}`;
        const defaultName = `${bankName.trim()} (${accountNumber.trim()}) [${currencyCode}]`;
        
        let code = (glAccountCode || defaultCode).trim();
        // Ensure code has currency suffix if not already present
        if (!code.toLowerCase().endsWith(suffix)) {
          code = `${code}${suffix}`;
        }

        let name = (glAccountName || defaultName).trim();
        // Ensure name has currency indicator if not already present
        const nameSuffix = `[${currencyCode}]`;
        if (!name.toUpperCase().includes(nameSuffix)) {
          name = `${name} ${nameSuffix}`;
        }

        // Try to find the account with the processed code
        account = await tx.account.findUnique({
          where: {
            organisationId_code: {
              organisationId: user.organisationId,
              code: code,
            }
          }
        });

        if (!account) {
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
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
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
