import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { StudentService, SupplierService } from "@/lib/services/party.service";
import { ARService } from "@/lib/services/ar.service";
import { APService } from "@/lib/services/ap.service";
import { VoucherService } from "@/lib/services/voucher.service";
import { AccountService } from "@/lib/services/account.service";
import { FiscalPeriodService } from "@/lib/services/fiscal-period.service";
import { Decimal } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthContext(req);
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

    const receivableAcc = await getAccount("1200", "Fees Receivable", "ASSET");
    const revenueAcc = await getAccount("4100", "Tuition Fees Revenue", "REVENUE");
    const payableAcc = await getAccount("2100", "Accounts Payable", "LIABILITY");
    const expenseAcc = await getAccount("5100", "General Expenses", "EXPENSE");
    const bankAcc = await getAccount("1100", "Main Bank Account", "ASSET");

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

    // 4. Create Students
    const studentNames = [
      { first: "John", last: "Doe", num: "ST001", grade: "Grade 1", class: "A" },
      { first: "Jane", last: "Smith", num: "ST002", grade: "Grade 1", class: "B" },
      { first: "Michael", last: "Brown", num: "ST003", grade: "Grade 2", class: "A" },
      { first: "Emily", last: "Davis", num: "ST004", grade: "Grade 2", class: "C" },
      { first: "Sarah", last: "Wilson", num: "ST005", grade: "Grade 3", class: "B" },
    ];

    const students = [];
    for (const s of studentNames) {
      const existing = await prisma.$queryRaw`SELECT id FROM students WHERE "organisationId" = ${organisationId} AND "studentNumber" = ${s.num}`;
      let student = (existing as any[])[0];
      
      if (!student) {
        // Use raw insert to bypass stale Prisma client 'class' field issue
        const id = `stu-${s.num.toLowerCase()}`;
        await prisma.$executeRaw`
          INSERT INTO students (id, "organisationId", "studentNumber", "firstName", "lastName", grade, class, "updatedAt")
          VALUES (${id}, ${organisationId}, ${s.num}, ${s.first}, ${s.last}, ${s.grade}, ${s.class}, NOW())
        `;
        student = { id };
      }
      students.push(student);
    }

    // 3. Create Suppliers
    const supplierNames = [
      { name: "Global Books & Stationery", code: "SUP001" },
      { name: "Fresh Foods Catering", code: "SUP002" },
      { name: "City Power & Water", code: "SUP003" },
    ];

    const suppliers = [];
    for (const s of supplierNames) {
      const existing = await prisma.$queryRaw`SELECT id FROM suppliers WHERE "organisationId" = ${organisationId} AND code = ${s.code}`;
      let supplier = (existing as any[])[0];

      if (!supplier) {
        const id = `sup-${s.code.toLowerCase()}`;
        await prisma.$executeRaw`
          INSERT INTO suppliers (id, "organisationId", code, name, "updatedAt")
          VALUES (${id}, ${organisationId}, ${s.code}, ${s.name}, NOW())
        `;
        supplier = { id };
      }
      suppliers.push(supplier);
    }

    // 4. Create and Post Invoices
    for (const student of students) {
      const invoice = await ARService.createInvoice({
        organisationId,
        studentId: student.id,
        currencyCode: org.baseCurrency,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Term 1 School Fees",
        fundId: generalFund.id,
        lines: [
          { description: "Tuition Fees", quantity: 1, unitPrice: 1200, amount: 1200 },
          { description: "Levy", quantity: 1, unitPrice: 200, amount: 200 }
        ]
      }, actorId);

      // Submit and Approve and Post Voucher
      await VoucherService.submit(invoice.voucherId, actorId);
      await VoucherService.approve(invoice.voucherId, actorId);
      await VoucherService.post(invoice.voucherId, actorId);
    }

    // 5. Create and Post Receipts for some students
    for (let i = 0; i < 3; i++) {
      const student = students[i];
      const receipt = await ARService.createReceipt({
        organisationId,
        studentId: student.id,
        bankAccountId: bankAcc.id,
        amount: 1000,
        currencyCode: org.baseCurrency,
        date: new Date().toISOString(),
        paymentMethod: "Bank Transfer",
        reference: `TXN-${Math.random().toString(36).substring(7).toUpperCase()}`
      }, actorId);

      await VoucherService.submit(receipt.voucherId, actorId);
      await VoucherService.approve(receipt.voucherId, actorId);
      await VoucherService.post(receipt.voucherId, actorId);

      // Allocate to first invoice
      const studentInv = await prisma.aRInvoice.findFirst({
        where: { studentId: student.id, balance: { gt: 0 } }
      });
      if (studentInv) {
        await ARService.allocate({
          receiptId: receipt.id,
          allocations: [{ invoiceId: studentInv.id, amount: 1000 }]
        }, actorId);
      }
    }

    // 6. Create and Post Bills
    let billCount = 0;
    for (const supplier of suppliers) {
      const isProjectBill = billCount === 0; // First supplier bill is for a project
      const bill = await APService.createBill({
        organisationId,
        supplierId: supplier.id,
        currencyCode: org.baseCurrency,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        description: isProjectBill ? "Library Expansion Materials" : "Monthly Supplies",
        fundId: isProjectBill ? capitalFund.id : generalFund.id,
        projectId: isProjectBill ? libraryProject.id : undefined,
        lines: [
          { 
            accountId: expenseAcc.id, 
            description: isProjectBill ? "Construction Materials" : "General Supplies", 
            quantity: 10, 
            unitPrice: isProjectBill ? 500 : 50, 
            amount: isProjectBill ? 5000 : 500 
          }
        ]
      }, actorId);

      await VoucherService.submit(bill.voucherId, actorId);
      await VoucherService.approve(bill.voucherId, actorId);
      await VoucherService.post(bill.voucherId, actorId);
      billCount++;
    }

    // 7. Create and Post Payments
    for (let i = 0; i < 2; i++) {
      const supplier = suppliers[i];
      const payment = await APService.createPayment({
        organisationId,
        supplierId: supplier.id,
        bankAccountId: bankAcc.id,
        amount: 300,
        currencyCode: org.baseCurrency,
        date: new Date().toISOString(),
        paymentMethod: "Electronic Transfer"
      }, actorId);

      await VoucherService.submit(payment.voucherId, actorId);
      await VoucherService.approve(payment.voucherId, actorId);
      await VoucherService.post(payment.voucherId, actorId);

      const supplierBill = await prisma.aPBill.findFirst({
        where: { supplierId: supplier.id, balance: { gt: 0 } }
      });
      if (supplierBill) {
        await APService.allocate({
          paymentId: payment.id,
          allocations: [{ billId: supplierBill.id, amount: 300 }]
        }, actorId);
      }
    }

    return NextResponse.json({ message: "Demo data generated successfully" });

  } catch (error: any) {
    console.error("Seed Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
