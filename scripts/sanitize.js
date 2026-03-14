
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const organisationId = 'org-demo';
  const actorId = 'user-admin';

  console.log('Starting sanitisation for organisation:', organisationId);

  // 1. Resolve correct accounts and move entries
  const parentCodes = ["1121", "4210", "2111"];
  
  // Get all accounts for this org
  const accounts = await prisma.account.findMany({
    where: { organisationId }
  });

  const getAccountByCode = (code) => accounts.find(a => a.code === code);

  for (const parentCode of parentCodes) {
    const parentAccount = getAccountByCode(parentCode);
    if (!parentAccount) continue;

    console.log(`Processing parent account: ${parentCode}`);

    // Find all voucher lines using this parent account or incorrect currency sub-accounts
    const lines = await prisma.voucherLine.findMany({
      where: {
        voucher: { organisationId },
        OR: [
          { accountId: parentAccount.id },
          { account: { code: { startsWith: `${parentCode}.` } } }
        ]
      },
      include: { account: true, voucher: true }
    });

    for (const line of lines) {
      const currencySuffix = line.currencyCode.toUpperCase();
      const correctCode = `${parentCode}.${currencySuffix}`;
      
      let correctAccount = getAccountByCode(correctCode);
      
      if (!correctAccount) {
        console.log(`Creating missing account: ${correctCode}`);
        correctAccount = await prisma.account.create({
          data: {
            organisationId,
            code: correctCode,
            name: `${parentAccount.name} - ${currencySuffix}`,
            type: parentAccount.type,
            parentId: parentAccount.id,
            isSystemAccount: true,
          }
        });
        // Update local cache
        accounts.push(correctAccount);
      }

      if (line.accountId !== correctAccount.id) {
        console.log(`Moving line ${line.id} from ${line.account.code} to ${correctCode}`);
        await prisma.voucherLine.update({
          where: { id: line.id },
          data: { accountId: correctAccount.id }
        });
      }
    }

    // Do the same for GLEntries
    const entries = await prisma.gLEntry.findMany({
      where: {
        glHeader: { organisationId },
        OR: [
          { accountId: parentAccount.id },
          { account: { code: { startsWith: `${parentCode}.` } } }
        ]
      },
      include: { account: true }
    });

    for (const entry of entries) {
      const currencySuffix = entry.currencyCode.toUpperCase();
      const correctCode = `${parentCode}.${currencySuffix}`;
      const correctAccount = getAccountByCode(correctCode);

      if (correctAccount && entry.accountId !== correctAccount.id) {
        console.log(`Moving GL entry ${entry.id} to ${correctCode}`);
        await prisma.gLEntry.update({
          where: { id: entry.id },
          data: { accountId: correctAccount.id }
        });
      }
    }
  }

  // 2. Fix Double Conversion Bug in existing records
  console.log('Checking for double conversion issues...');
  const voucherLines = await prisma.voucherLine.findMany({
    where: {
      voucher: { 
        organisationId,
        type: { in: ['AR_INVOICE', 'AR_RECEIPT', 'AP_BILL', 'AP_PAYMENT'] }
      },
      fxRate: { gt: 1 }
    }
  });

  for (const line of voucherLines) {
    const fxRate = Number(line.fxRate);
    const amountFc = Number(line.amountFc);
    const amountLc = Number(line.amountLc);

    // If amountLc is approx amountFc * fxRate * fxRate, it's double converted
    const expectedLcIfSingle = amountFc * fxRate;
    const ratio = amountLc / expectedLcIfSingle;

    if (Math.abs(ratio - fxRate) < 0.01) {
      console.log(`Detected double conversion in line ${line.id}. Fixing...`);
      const correctAmountFc = amountFc / fxRate;
      const correctAmountLc = amountFc; // The old amountFc was actually the intended LC

      await prisma.voucherLine.update({
        where: { id: line.id },
        data: {
          amountFc: correctAmountFc,
          amountLc: correctAmountLc,
          debit: line.debit ? correctAmountFc : null,
          credit: line.credit ? correctAmountFc : null,
          debitFc: line.debitFc ? correctAmountFc : null,
          creditFc: line.creditFc ? correctAmountFc : null,
          debitLc: line.debitLc ? correctAmountLc : null,
          creditLc: line.creditLc ? correctAmountLc : null,
        }
      });
      
      // Also fix GL entries if they exist
      await prisma.gLEntry.updateMany({
        where: { 
          glHeader: { voucherId: line.voucherId },
          lineNumber: line.lineNumber
        },
        data: {
          amountFc: correctAmountFc,
          amountLc: correctAmountLc,
          debitFc: line.debitFc ? correctAmountFc : null,
          creditFc: line.creditFc ? correctAmountFc : null,
          debitLc: line.debitLc ? correctAmountLc : null,
          creditLc: line.creditLc ? correctAmountLc : null,
        }
      });
    }
  }

  console.log('Sanitisation complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
