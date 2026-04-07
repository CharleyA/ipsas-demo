
import prisma from "../src/lib/db";
import { ARService } from "../src/lib/services/ar.service";
import { APService } from "../src/lib/services/ap.service";
import { VoucherService } from "../src/lib/services/voucher.service";
import { AccountService } from "../src/lib/services/account.service";
import { FiscalPeriodService } from "../src/lib/services/fiscal-period.service";

async function main() {
    const adminUser = await prisma.user.findFirst({
        where: { email: "admin@school.ac.zw" },
        include: { organisations: { take: 1 } }
    });

    if (!adminUser) {
        console.error("Admin user not found");
        return;
    }

    const actorId = adminUser.id;

    // 1. Ensure Organisation has required accounts
    let org = await prisma.organisation.findFirst({
      where: { users: { some: { userId: adminUser.id } } },
      include: { chartOfAccounts: true }
    });

    if (!org) {
        console.error("Organisation not found");
        return;
    }

    const organisationId = org.id;

    const getAccount = async (code: string, name: string, type: any) => {
      let acc = org?.chartOfAccounts.find(a => a.code === code);
      if (!acc) {
        acc = await AccountService.create({
          organisationId,
          code,
          name,
          type,
          isSystemAccount: true
        }, actorId);
      }
      return acc;
    };

    const receivableAcc = await getAccount("1200", "Fees Receivable", "ASSET");
    const revenueAcc = await getAccount("4100", "Tuition Fees Revenue", "REVENUE");
    const grantRevenueAcc = await getAccount("4200", "Grant Income", "REVENUE");
    const payableAcc = await getAccount("2100", "Accounts Payable", "LIABILITY");
    const expenseAcc = await getAccount("5100", "General Expenses", "EXPENSE");
    const utilityExpenseAcc = await getAccount("5200", "Utilities", "EXPENSE");
    const bankAcc = await getAccount("1100", "Main Bank Account", "ASSET");

    // Ensure BankAccount record exists
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { organisationId, accountId: bankAcc.id }
    });
    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          organisationId,
          accountId: bankAcc.id,
          bankName: "Standard Bank",
          accountNumber: "1234567890",
          currencyCode: org.baseCurrency
        }
      });
    }

    // Ensure exchange rate exists
    await prisma.exchangeRate.upsert({
      where: { fromCurrencyCode_toCurrencyCode_effectiveDate: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG", effectiveDate: new Date("2026-01-01") } },
      update: { rate: 25.0 },
      create: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG", rate: 25.0, effectiveDate: new Date("2026-01-01"), source: "Demo" }
    });

    let period = await FiscalPeriodService.getCurrentPeriod(organisationId);
    if (!period) {
        const now = new Date();
        period = await prisma.fiscalPeriod.create({
            data: {
                organisationId,
                year: now.getFullYear(),
                period: now.getMonth() + 1,
                name: `Period ${now.getMonth() + 1} - ${now.getFullYear()}`,
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
                status: "OPEN"
            }
        });
    }

    // 2. Funds
    const fundData = [
      { code: "GF", name: "General Fund" },
      { code: "CF", name: "Capital Fund" },
      { code: "RF", name: "Restricted Grant Fund" },
    ];
    const funds = [];
    for (const f of fundData) {
      let fund = await prisma.fund.upsert({
        where: { organisationId_code: { organisationId, code: f.code } },
        update: {},
        create: { organisationId, code: f.code, name: f.name }
      });
      funds.push(fund);
    }
    const generalFund = funds.find(f => f.code === "GF")!;
    const grantFund = funds.find(f => f.code === "RF")!;

    // 3. Projects
    const projectData = [
      { code: "LIB-2025", name: "School Library Expansion" },
      { code: "ICT-UPG", name: "ICT Infrastructure Upgrade" },
    ];
    const projects = [];
    for (const p of projectData) {
      let project = await prisma.project.upsert({
        where: { organisationId_code: { organisationId, code: p.code } },
        update: {},
        create: { organisationId, code: p.code, name: p.name }
      });
      projects.push(project);
    }
    const libraryProject = projects.find(p => p.code === "LIB-2025")!;

    // 4. Students & Suppliers
    const studentIds = (await prisma.student.findMany({ where: { organisationId }, select: { id: true } })).map(s => s.id);
    const supplierIds = (await prisma.supplier.findMany({ where: { organisationId }, select: { id: true } })).map(s => s.id);

    if (studentIds.length === 0 || supplierIds.length === 0) {
        console.error("Students or Suppliers not found. Please run the standard seed first.");
        return;
    }

    console.log("Generating Invoices...");
    for (let i = 0; i < studentIds.length; i++) {
      const isUSD = i % 2 === 0;
      const currencyCode = isUSD ? "USD" : "ZWG";
      const invoice = await ARService.createInvoice({
        organisationId,
        studentId: studentIds[i],
        currencyCode,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: `Term 1 School Fees (${currencyCode})`,
        fundId: generalFund.id,
        lines: [
          { description: "Tuition Fees", quantity: 1, unitPrice: isUSD ? 50 : 1250, amount: isUSD ? 50 : 1250 },
          { description: "Levy", quantity: 1, unitPrice: isUSD ? 10 : 250, amount: isUSD ? 10 : 250 }
        ]
      }, actorId);
      await VoucherService.submit(invoice.voucherId, actorId);
      await VoucherService.approve(invoice.voucherId, actorId);
      await VoucherService.post(invoice.voucherId, actorId);
    }

    console.log("Generating Bills...");
    for (let i = 0; i < supplierIds.length; i++) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierIds[i] } });
      const isUtility = supplier?.name.includes("ZESA") || supplier?.name.includes("City");
      const isUSD = !isUtility && (i % 2 === 0);
      const currencyCode = isUSD ? "USD" : "ZWG";
      
      const bill = await APService.createBill({
        organisationId,
        supplierId: supplierIds[i],
        currencyCode,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        description: isUtility ? `Monthly Utility: ${supplier?.name}` : "Monthly Supplies",
        fundId: generalFund.id,
        lines: [
          { 
            accountId: isUtility ? utilityExpenseAcc.id : expenseAcc.id, 
            description: isUtility ? "Consumption Charges" : "General Supplies", 
            quantity: 1, 
            unitPrice: isUSD ? 100 : 2500, 
            amount: isUSD ? 100 : 2500 
          }
        ]
      }, actorId);
      await VoucherService.submit(bill.voucherId, actorId);
      await VoucherService.approve(bill.voucherId, actorId);
      await VoucherService.post(bill.voucherId, actorId);
    }

    console.log("Generating Grant Funding...");
    const grantVoucher = await VoucherService.create({
      organisationId,
      type: "JOURNAL",
      periodId: period.id,
      date: new Date(),
      description: "UNESCO Library Grant Funding (USD)",
      lines: [
        {
          lineNumber: 1,
          accountId: bankAcc.id,
          description: "Grant Funding Received",
          currencyCode: "USD",
          amountFc: 5000,
          fxRate: 25,
          amountLc: 5000 * 25,
          debit: 5000,
          fundId: grantFund.id,
          projectId: libraryProject.id
        },
        {
          lineNumber: 2,
          accountId: grantRevenueAcc.id,
          description: "Unesco Grant Revenue",
          currencyCode: "USD",
          amountFc: 5000,
          fxRate: 25,
          amountLc: 5000 * 25,
          credit: 5000,
          fundId: grantFund.id,
          projectId: libraryProject.id
        }
      ]
    }, actorId);
    await VoucherService.submit(grantVoucher.id, actorId);
    await VoucherService.approve(grantVoucher.id, actorId);
    await VoucherService.post(grantVoucher.id, actorId);

    console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
