import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { StudentService, SupplierService } from "@/lib/services/party.service";
import { ARService } from "@/lib/services/ar.service";
import { APService } from "@/lib/services/ap.service";
import { VoucherService } from "@/lib/services/voucher.service";
import { AccountService } from "@/lib/services/account.service";
import { FiscalPeriodService } from "@/lib/services/fiscal-period.service";
import { Decimal } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const authContext = await verifyAuth(req);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const organisationId = authContext.organisationId;
    const actorId = authContext.userId;

    // 1. Ensure Organisation has required accounts
    let org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      include: { chartOfAccounts: true }
    });

    if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

    // Helper to find or create account
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

    const receivableAcc = await getAccount("1121", "Fees Receivable", "ASSET");
    const revenueAcc = await getAccount("4210", "Rendering of Services (Fees)", "REVENUE");
    const grantRevenueAcc = await getAccount("4200", "Grant Income", "REVENUE");
    const payableAcc = await getAccount("2111", "Trade Payables", "LIABILITY");
    const expenseAcc = await getAccount("5100", "General Expenses", "EXPENSE");
    const utilityExpenseAcc = await getAccount("5200", "Utilities", "EXPENSE");
    const bankAcc = await getAccount("1112", "Main Bank Account", "ASSET");

    // Create sub-accounts for multi-currency
    await getAccount("1121.USD", "Fees Receivable - USD", "ASSET");
    await getAccount("1121.ZWG", "Fees Receivable - ZWG", "ASSET");
    await getAccount("4210.USD", "Fees Revenue - USD", "REVENUE");
    await getAccount("4210.ZWG", "Fees Revenue - ZWG", "REVENUE");
    await getAccount("2111.USD", "Trade Payables - USD", "LIABILITY");
    await getAccount("2111.ZWG", "Trade Payables - ZWG", "LIABILITY");

    // Update org settings if missing
    if (!org.arReceivableAccountId || !org.arRevenueAccountId || !org.apPayableAccountId || !org.apBankAccountId) {
      org = await prisma.organisation.update({
        where: { id: organisationId },
        data: {
          arReceivableAccountId: receivableAcc.id,
          arRevenueAccountId: revenueAcc.id,
          arBankAccountId: bankAcc.id,
          apPayableAccountId: payableAcc.id,
          apBankAccountId: bankAcc.id,
          apExpenseAccountId: expenseAcc.id
        },
        include: { chartOfAccounts: true }
      });
    }

    // Ensure BankAccount record exists for bankAcc
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

    // Ensure exchange rate exists for USD to ZWG (Demo purposes)
    const existingRate = await prisma.exchangeRate.findFirst({
      where: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG" }
    });
    if (!existingRate) {
      await prisma.exchangeRate.create({
        data: {
          fromCurrencyCode: "USD",
          toCurrencyCode: "ZWG",
          rate: 25.0,
          effectiveDate: new Date("2026-01-01"),
          source: "Demo"
        }
      });
    }

    // Ensure there's an open fiscal period
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

    // 2. Create Funds
    const fundData = [
      { code: "GF", name: "General Fund" },
      { code: "CF", name: "Capital Fund" },
      { code: "RF", name: "Restricted Grant Fund" },
    ];
    const funds = [];
    for (const f of fundData) {
      let fund = await prisma.fund.findUnique({
        where: { organisationId_code: { organisationId, code: f.code } }
      });
      if (!fund) {
        fund = await prisma.fund.create({
          data: { organisationId, code: f.code, name: f.name }
        });
      }
      funds.push(fund);
    }
    const generalFund = funds.find(f => f.code === "GF")!;
    const capitalFund = funds.find(f => f.code === "CF")!;
    const grantFund = funds.find(f => f.code === "RF")!;

    // 3. Create Projects
    const projectData = [
      { code: "LIB-2025", name: "School Library Expansion" },
      { code: "ICT-UPG", name: "ICT Infrastructure Upgrade" },
    ];
    const projects = [];
    for (const p of projectData) {
      let project = await prisma.project.findUnique({
        where: { organisationId_code: { organisationId, code: p.code } }
      });
      if (!project) {
        project = await prisma.project.create({
          data: { organisationId, code: p.code, name: p.name }
        });
      }
      projects.push(project);
    }
    const libraryProject = projects.find(p => p.code === "LIB-2025")!;

    // 4. Create Students (50 students)
    const firstNames = ["John", "Jane", "Michael", "Emily", "Sarah", "David", "Emma", "James", "Olivia", "William", "Sophia", "Robert", "Isabella", "Joseph", "Mia", "Thomas", "Charlotte", "Charles", "Amelia", "Daniel", "Evelyn", "Matthew", "Abigail", "Anthony", "Harper", "Mark", "Emily", "Steven", "Elizabeth", "Paul", "Sofia", "Andrew", "Avery", "Kenneth", "Ella", "Joshua", "Scarlett", "Kevin", "Madison", "Brian", "Layla", "George", "Victoria", "Edward", "Aria", "Ronald", "Grace", "Timothy", "Chloe", "Jason"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];
    const grades = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"];
    const classes = ["A", "B", "C"];

    const students = [];
    for (let i = 0; i < 50; i++) {
      const sNum = `ST${String(i + 1).padStart(3, "0")}`;
      const fName = firstNames[i % firstNames.length];
      const lName = lastNames[i % lastNames.length];
      const grade = grades[i % grades.length];
      const cls = classes[i % classes.length];

      const existing = await prisma.$queryRaw`SELECT id FROM students WHERE "organisationId" = ${organisationId} AND "studentNumber" = ${sNum}`;
      let student = (existing as any[])[0];
      
      if (!student) {
        const id = `stu-${sNum.toLowerCase()}`;
        await prisma.$executeRaw`
          INSERT INTO students (id, "organisationId", "studentNumber", "firstName", "lastName", grade, class, "updatedAt")
          VALUES (${id}, ${organisationId}, ${sNum}, ${fName}, ${lName}, ${grade}, ${cls}, NOW())
        `;
        student = { id };
      }
      students.push(student);
    }

    // 5. Create Fee Template
    let template = await prisma.feeTemplate.findFirst({
      where: { organisationId, academicYear: 2026, term: "Term 1" }
    });

    if (!template) {
      template = await prisma.feeTemplate.create({
        data: {
          organisationId,
          name: "General Fees 2026 T1",
          academicYear: 2026,
          term: "Term 1",
          grades: grades,
          currencyCode: "USD",
          items: {
            create: [
              { description: "Tuition Fees", amount: 150, order: 0 },
              { description: "Development Levy", amount: 50, order: 1 },
              { description: "Sports Fee", amount: 20, order: 2 }
            ]
          }
        },
        include: { items: true }
      });
    }

    // 6. Generate Bulk Invoices (Fee Batch)
    const { FeeGenerationService } = await import("@/lib/services/fee-generation.service");
    const batchResult = await FeeGenerationService.generate({
      organisationId,
      templateId: template.id,
      grades: grades
    }, actorId);

    // 7. Post the generated invoices
    const batchInvoices = await prisma.aRInvoice.findMany({
      where: { batchId: batchResult.batch.id }
    });

    console.log(`Posting ${batchInvoices.length} invoices...`);
    for (const inv of batchInvoices) {
      try {
        await VoucherService.submit(inv.voucherId, actorId);
        await VoucherService.approve(inv.voucherId, actorId);
        await VoucherService.post(inv.voucherId, actorId);
      } catch (e) {
        console.error(`Failed to post invoice ${inv.id}:`, e);
      }
    }

    // 8. Create and Post Receipts for all students (to show realistic data)
    let receiptsCreated = 0;
    console.log(`Creating receipts for ${students.length} students...`);
    // Use a sequential loop to avoid voucher number conflicts
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      // Give some students full payments, some partial, some none
      const paymentScenario = i % 5; // 0,1,2,3: pay, 4: no pay
      if (paymentScenario === 4) continue;

      const isFullPayment = i % 2 === 0;
      const amount = isFullPayment ? 220 : (50 + Math.floor(Math.random() * 100)); // $220 full or partial

      try {
          const receipt = await ARService.createReceipt({
            organisationId,
            studentId: student.id,
            bankAccountId: bankAcc.id,
            amount: amount,
            currencyCode: "USD",
            date: new Date().toISOString(),
            paymentMethod: i % 2 === 0 ? "Bank Transfer" : "Cash",
            reference: `DEMO-REC-${Date.now()}-${i}-${Math.random().toString(36).substring(7).toUpperCase()}`
          }, actorId);

        await VoucherService.submit(receipt.voucherId, actorId);
        await VoucherService.approve(receipt.voucherId, actorId);
        await VoucherService.post(receipt.voucherId, actorId);
        receiptsCreated++;

        // Allocate to the invoice we just generated
        const studentInv = await prisma.aRInvoice.findFirst({
          where: { studentId: student.id, batchId: batchResult.batch.id, balance: { gt: 0 } }
        });
        
        if (studentInv) {
          const allocAmount = Math.min(amount, Number(studentInv.balance));
          await ARService.allocate({
            receiptId: receipt.id,
            allocations: [{ invoiceId: studentInv.id, amount: allocAmount }]
          }, actorId);
        }
      } catch (e) {
        console.error(`Failed to create/post receipt for student ${student.id}:`, e);
      }
    }

    return NextResponse.json({ 
      message: "Demo data generated successfully",
      summary: {
        students: students.length,
        feeTemplate: template.name,
        batchNumber: batchResult.batch.batchNumber,
        invoicesGenerated: batchResult.results.successful,
        receiptsCreated: receiptsCreated
      }
    });

  } catch (error: any) {
    console.error("Seed Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
