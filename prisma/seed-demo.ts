/**
 * Phase 4 Demo Data Seed
 * Generates 2 years of realistic school finance data:
 * - 8 suppliers, 50 students across 3 classes
 * - 2 fiscal periods + approved budget
 * - 2 funds, 4 cost centres
 * - 24 months of monthly journals (salaries, utilities, maintenance)
 * - 3 terms of student fee invoices + receipts
 * - AP bills + payments for each supplier
 * - 20+ inventory movements across 12 months
 * - 5 USD transactions to demo multi-currency
 * - Exchange rates
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── IDs from live DB ─────────────────────────────────────────────
const ORG_ID = "cmnnrn3h4000263uifwkxbk7d";
const ADMIN_ID = "cmnnrn3h7000363uivw5bo6b6";
const BURSAR_ID = "cmnnrn3ha000563uichf728e5";

// Account IDs
const ACC = {
  cash:        "cmnnrxyw20009opui55ck7ii9", // 1112 Main Bank Account
  pettyCash:   "cmnnrxyw10008opui3xfo91oi", // 1111 Petty Cash
  feesRec:     "cmnnrxyw6000bopuis6ski2nh", // 1121 Fees Receivable
  feesRecUsd:  "cmnnrxyw7000copuiszaqgnsy", // 1121.USD
  feesRecZwg:  "cmnnrxyw9000dopuiqgm06nnh", // 1121.ZWG
  tradePayable:"cmnnrxywl000lopuinugmh75h", // 2111 Trade Payables
  tradePayUsd: "cmnnrxywm000mopuiqn0f1dkf", // 2111.USD
  accSurplus:  "cmnnrxyws000qopuitr8cn7n7", // 3100 Accumulated Surpluses
  feeRevenue:  "cmnnrxyx2000xopuiyuri5bo8", // 4210 Rendering of Services
  feeRevUsd:   "cmnnrxyx4000yopuil3281fgu", // 4210.USD
  feeRevZwg:   "cmnnrxyx5000zopuiwchz71r7", // 4210.ZWG
  salaries:    "cmnnrxyxa0012opui7j6ui7my", // 5100 Wages & Salaries
  supplies:    "cmnnrxyxb0013opuiyvjcusxq", // 5200 Supplies & Consumables
  otherExp:    "cmnnrxyxe0015opuiuh04zu90", // 5400 Other Expenses
};

// Inventory item IDs
const ITEMS = {
  paper:   "item_st001",
  pens:    "item_st002",
  markers: "item_st003",
  staples: "item_st004",
  foolscap:"item_st005",
  toner:   "item_st006",
};

function d(year: number, month: number, day = 1): Date {
  return new Date(year, month - 1, day);
}

// Derive period (1-based quarter-like annual periods: all 2024 = period 1, all 2025 = period 2)
// We'll use year-based fiscal periods where period=1 means the annual period
function voucherNumber(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

async function main() {
  console.log("🌱 Starting Phase 4 demo seed...");

  // ── 1. Exchange Rates ────────────────────────────────────────
  console.log("Exchange rates...");
  const fxRates = [
    { month: 1, rate: 3500 }, { month: 2, rate: 3600 }, { month: 3, rate: 3700 },
    { month: 4, rate: 3800 }, { month: 5, rate: 3900 }, { month: 6, rate: 4000 },
    { month: 7, rate: 4100 }, { month: 8, rate: 4200 }, { month: 9, rate: 4300 },
    { month: 10, rate: 4400 }, { month: 11, rate: 4500 }, { month: 12, rate: 4600 },
  ];
  for (const yr of [2024, 2025]) {
    for (const { month, rate } of fxRates) {
      await prisma.exchangeRate.upsert({
        where: { fromCurrencyCode_toCurrencyCode_effectiveDate: {
          fromCurrencyCode: "USD", toCurrencyCode: "ZWG",
          effectiveDate: d(yr, month),
        }},
        update: { rate },
        create: { fromCurrencyCode: "USD", toCurrencyCode: "ZWG", effectiveDate: d(yr, month), rate },
      });
    }
  }

  // ── 2. Organisation currencies ───────────────────────────────
  for (const code of ["ZWG", "USD"]) {
    await prisma.organisationCurrency.upsert({
      where: { organisationId_currencyCode: { organisationId: ORG_ID, currencyCode: code } },
      update: {},
      create: { organisationId: ORG_ID, currencyCode: code, isBaseCurrency: code === "ZWG" },
    });
  }

  // ── 3. Funds ─────────────────────────────────────────────────
  console.log("Funds & cost centres...");
  const [fundGeneral, fundDev] = await Promise.all([
    prisma.fund.upsert({
      where: { organisationId_code: { organisationId: ORG_ID, code: "GEN" } },
      update: {},
      create: { organisationId: ORG_ID, code: "GEN", name: "General Fund" },
    }),
    prisma.fund.upsert({
      where: { organisationId_code: { organisationId: ORG_ID, code: "DEV" } },
      update: {},
      create: { organisationId: ORG_ID, code: "DEV", name: "Development Fund" },
    }),
  ]);

  // ── 4. Cost Centres ──────────────────────────────────────────
  const ccDefs = [
    { code: "ADMIN",  name: "Administration" },
    { code: "ACAD",   name: "Academic Department" },
    { code: "SPORT",  name: "Sports & Extra-Curricular" },
    { code: "MAINT",  name: "Maintenance & Facilities" },
  ];
  const costCentres: Record<string, { id: string }> = {};
  for (const cc of ccDefs) {
    costCentres[cc.code] = await prisma.costCentre.upsert({
      where: { organisationId_code: { organisationId: ORG_ID, code: cc.code } },
      update: {},
      create: { organisationId: ORG_ID, code: cc.code, name: cc.name },
    });
  }

  // ── 5. Fiscal Periods ────────────────────────────────────────
  // FiscalPeriod unique: organisationId_year_period
  console.log("Fiscal periods...");
  const fp2024 = await prisma.fiscalPeriod.upsert({
    where: { organisationId_year_period: { organisationId: ORG_ID, year: 2024, period: 1 } },
    update: {},
    create: { organisationId: ORG_ID, year: 2024, period: 1, name: "FY 2024", startDate: d(2024,1), endDate: d(2024,12,31), status: "CLOSED" },
  });
  const fp2025 = await prisma.fiscalPeriod.upsert({
    where: { organisationId_year_period: { organisationId: ORG_ID, year: 2025, period: 1 } },
    update: {},
    create: { organisationId: ORG_ID, year: 2025, period: 1, name: "FY 2025", startDate: d(2025,1), endDate: d(2025,12,31), status: "OPEN" },
  });

  // ── 6. Budget for FY 2025 ────────────────────────────────────
  console.log("Budget...");
  const existingBudget = await prisma.budget.findFirst({
    where: { organisationId: ORG_ID, fiscalPeriodId: fp2025.id },
  });
  if (!existingBudget) {
    const budget = await prisma.budget.create({
      data: {
        organisationId: ORG_ID,
        fiscalPeriodId: fp2025.id,
        version: 1,
        status: "APPROVED",
        createdById: ADMIN_ID,
        approvedById: BURSAR_ID,
        approvedAt: d(2025, 1, 5),
        lines: {
          create: [
            { accountId: ACC.salaries,   amount: 18000000, fundId: fundGeneral.id, costCentreId: costCentres.ADMIN.id, periodLabel: "FY2025" },
            { accountId: ACC.supplies,   amount: 2400000,  fundId: fundGeneral.id, costCentreId: costCentres.ACAD.id,  periodLabel: "FY2025" },
            { accountId: ACC.otherExp,   amount: 3600000,  fundId: fundGeneral.id, costCentreId: costCentres.MAINT.id, periodLabel: "FY2025" },
            { accountId: ACC.feeRevenue, amount: 28000000, fundId: fundGeneral.id, costCentreId: costCentres.ADMIN.id, periodLabel: "FY2025" },
          ],
        },
      },
    });
    console.log(`  Budget created: ${budget.id}`);
  }

  // ── 7. Suppliers ─────────────────────────────────────────────
  console.log("Suppliers...");
  const supplierDefs = [
    { code: "SUP001", name: "Pinnacle Office Supplies" },
    { code: "SUP002", name: "Zim Catering Services" },
    { code: "SUP003", name: "TechFix IT Solutions" },
    { code: "SUP004", name: "CleanPro Hygiene Services" },
    { code: "SUP005", name: "BuildRight Construction" },
    { code: "SUP006", name: "PowerGrid Electricity" },
    { code: "SUP007", name: "AquaPure Water Services" },
    { code: "SUP008", name: "Stationery Direct Ltd" },
  ];
  const suppliers: Record<string, { id: string; name: string }> = {};
  for (const s of supplierDefs) {
    const sup = await prisma.supplier.upsert({
      where: { organisationId_code: { organisationId: ORG_ID, code: s.code } },
      update: {},
      create: { organisationId: ORG_ID, code: s.code, name: s.name },
    });
    suppliers[s.code] = sup;
  }

  // ── 8. Students (50 across 3 classes) ────────────────────────
  console.log("Students...");
  const classes = ["Form 1A", "Form 2B", "Form 3C"];
  const firstNames = ["Takudzwa","Chiedza","Munashe","Ruvimbo","Tatenda","Simba","Nyasha","Farai","Tafara","Rutendo","Kudzai","Thandeka","Blessing","Tinashe","Tinotenda","Admire","Precious","Talent","Rejoice","Trymore","Mazvita","Chenai","Ngoni","Kudakwashe","Tafadzwa","Vimbai","Shingai","Panashe","Gugulethu","Tanatswa","Tawanda","Ngonidzashe","Fadzai","Tonderai","Chido","Tapiwa","Munyaradzi","Tariro","Makudzei","Tarisai","Shamiso","Anashe","Moreblessing","Rumbidzai","Nkosilathi","Thandolwethu","Sibonile","Sanelisiwe","Lungelo","Siphamandla"];
  const lastNames  = ["Moyo","Ncube","Dube","Ndlovu","Mpofu","Sibanda","Nkomo","Mthethwa","Khumalo","Phiri","Banda","Mutasa","Chikwanda","Mutamba","Mhlanga","Hadebe","Tshuma","Munemo","Chirimuuta","Zinyama","Musekiwa","Chirwa","Gomba","Mushonga","Denhere","Kuwana","Mungazi","Bare","Gwandu","Nyamhunga","Mashayamombe","Mucharwa","Vheremu","Mhetu","Chakabuda","Sanyangore","Mukutu","Chizema","Makwanya","Jiri","Samushonga","Mapuranga","Shoko","Zaranyika","Mwale","Chivanga","Hlatshwayo","Gumbi","Ntini","Mpofu2"];

  const studentIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const cls = classes[i % 3];
    const sn = `STU${String(i + 1).padStart(3, "0")}`;
    const student = await prisma.student.upsert({
      where: { organisationId_studentNumber: { organisationId: ORG_ID, studentNumber: sn } },
      update: {},
      create: {
        organisationId: ORG_ID,
        studentNumber: sn,
        firstName: firstNames[i] ?? `Student${i}`,
        lastName: lastNames[i] ?? `Surname${i}`,
        grade: cls,
      },
    });
    studentIds.push(student.id);
  }
  console.log(`  ${studentIds.length} students created`);

  // ── Helper: determine fiscal period ID by date ────────────────
  function periodIdForDate(date: Date): string {
    return date.getFullYear() >= 2025 ? fp2025.id : fp2024.id;
  }

  // ── Helper: unique voucher number counter ─────────────────────
  let vNum = 1000;
  function nextVNum() { return ++vNum; }

  // ── Helper: create a POSTED voucher with GL entries ──────────
  async function postJournal(opts: {
    number: string;
    type: "JOURNAL" | "INVOICE" | "RECEIPT" | "BILL" | "PAYMENT";
    date: Date;
    description: string;
    currencyCode?: string;
    fxRate?: number;
    studentId?: string;
    supplierId?: string;
    lines: Array<{
      accountId: string;
      lineNumber?: number;
      debitLc?: number; creditLc?: number;
      debitFc?: number; creditFc?: number;
      description?: string;
      costCentreId?: string;
      fundId?: string;
    }>;
  }) {
    const currency = opts.currencyCode ?? "ZWG";
    const fxRate = opts.fxRate ?? (currency === "USD" ? 4200 : 1);

    const voucher = await prisma.voucher.create({
      data: {
        organisationId: ORG_ID,
        number: opts.number,
        type: opts.type,
        status: "POSTED",
        description: opts.description,
        date: opts.date,
        periodId: periodIdForDate(opts.date),
        createdById: ADMIN_ID,
        studentId: opts.studentId,
        supplierId: opts.supplierId,
      },
    });

    const glHeader = await prisma.gLHeader.create({
      data: {
        organisationId: ORG_ID,
        periodId: periodIdForDate(opts.date),
        voucherId: voucher.id,
        entryNumber: opts.number,
        description: opts.description,
        entryDate: opts.date,
      },
    });

    for (const [idx, line] of opts.lines.entries()) {
      await prisma.gLEntry.create({
        data: {
          glHeaderId: glHeader.id,
          lineNumber: line.lineNumber ?? idx + 1,
          accountId: line.accountId,
          description: line.description ?? opts.description,
          currencyCode: currency,
          fxRate,
          debitLc: line.debitLc ?? 0,
          creditLc: line.creditLc ?? 0,
          debitFc: line.debitFc ?? (currency === "USD" ? (line.debitLc ?? 0) / fxRate : 0),
          creditFc: line.creditFc ?? (currency === "USD" ? (line.creditLc ?? 0) / fxRate : 0),
          costCentreId: line.costCentreId ?? null,
          fundId: line.fundId ?? fundGeneral.id,
        },
      });
    }

    return voucher;
  }

  // ── 9. Monthly Journals: FY2024 + FY2025 ────────────────────
  console.log("Monthly journals (24 months)...");

  const monthlyData = [
    // [year, month, salaries_zwg, utilities_zwg, maintenance_zwg, fee_rev_zwg]
    [2024,  1, 1400000, 120000,  80000, 2200000],
    [2024,  2, 1400000, 118000,  75000, 2200000],
    [2024,  3, 1400000, 115000,  90000, 2200000],
    [2024,  4, 1450000, 122000,  85000, 2300000],
    [2024,  5, 1450000, 119000,  78000, 2300000],
    [2024,  6, 1450000, 116000,  95000, 2300000],
    [2024,  7, 1500000, 125000,  82000, 2400000],
    [2024,  8, 1500000, 121000,  88000, 2400000],
    [2024,  9, 1500000, 118000,  92000, 2400000],
    [2024, 10, 1550000, 128000,  86000, 2500000],
    [2024, 11, 1550000, 124000,  79000, 2500000],
    [2024, 12, 1600000, 130000, 105000, 2500000],
    [2025,  1, 1600000, 132000,  88000, 2600000],
    [2025,  2, 1600000, 128000,  82000, 2600000],
    [2025,  3, 1650000, 135000,  95000, 2700000],
    [2025,  4, 1650000, 131000,  90000, 2700000],
    [2025,  5, 1700000, 138000,  98000, 2800000],
    [2025,  6, 1700000, 134000, 102000, 2800000],
    [2025,  7, 1750000, 142000,  94000, 2900000],
    [2025,  8, 1750000, 138000,  87000, 2900000],
    [2025,  9, 1800000, 145000, 108000, 3000000],
    [2025, 10, 1800000, 141000,  96000, 3000000],
    [2025, 11, 1850000, 148000, 101000, 3100000],
    [2025, 12, 1900000, 155000, 112000, 3200000],
  ] as [number,number,number,number,number,number][];

  let jnlCount = 0;

  for (const [yr, mo, sal, util, maint, fees] of monthlyData) {
    const date = d(yr, mo, 28);
    const moStr = String(mo).padStart(2,"0");

    // Salary journal
    await postJournal({
      number: `JNL-SAL-${yr}${moStr}`,
      type: "JOURNAL",
      date,
      description: `Salary run – ${yr}/${moStr}`,
      lines: [
        { accountId: ACC.salaries, debitLc: sal,  costCentreId: costCentres.ADMIN.id },
        { accountId: ACC.cash,     creditLc: sal },
      ],
    });
    jnlCount++;

    // Utilities journal
    await postJournal({
      number: `JNL-UTIL-${yr}${moStr}`,
      type: "JOURNAL",
      date,
      description: `Utilities – ${yr}/${moStr}`,
      lines: [
        { accountId: ACC.otherExp, debitLc: util,  costCentreId: costCentres.MAINT.id },
        { accountId: ACC.cash,     creditLc: util },
      ],
    });
    jnlCount++;

    // Maintenance journal (selected months for realism)
    if ([1,2,4,7,8,10].includes(mo)) {
      await postJournal({
        number: `JNL-MAINT-${yr}${moStr}`,
        type: "JOURNAL",
        date,
        description: `Maintenance costs – ${yr}/${moStr}`,
        lines: [
          { accountId: ACC.otherExp, debitLc: maint, costCentreId: costCentres.MAINT.id },
          { accountId: ACC.cash,     creditLc: maint },
        ],
      });
      jnlCount++;
    }

    // Fee revenue recognition (school terms: T1=Jan, T2=May, T3=Sep)
    if ([1, 5, 9].includes(mo)) {
      const termLabel = mo === 1 ? 1 : mo === 5 ? 2 : 3;
      await postJournal({
        number: `JNL-FEES-${yr}-T${termLabel}`,
        type: "JOURNAL",
        date: d(yr, mo, 15),
        description: `Fee revenue – ${yr} Term ${termLabel}`,
        lines: [
          { accountId: ACC.feesRec,    debitLc: fees },
          { accountId: ACC.feeRevenue, creditLc: fees },
        ],
      });
      jnlCount++;
    }
  }
  console.log(`  ${jnlCount} journals created`);

  // ── 10. USD Transactions (multi-currency) ────────────────────
  console.log("USD multi-currency transactions...");
  const usdFxRate = 4200;

  for (let i = 1; i <= 5; i++) {
    const usdAmount = 500 * i;   // $500, $1000, ... $2500
    const zwgAmount = usdAmount * usdFxRate;
    await postJournal({
      number: `JNL-USD-${i}`,
      type: "JOURNAL",
      date: d(2025, i * 2, 10),
      description: `USD fee receipt – student ${i}`,
      currencyCode: "USD",
      fxRate: usdFxRate,
      lines: [
        { accountId: ACC.cash,      debitLc: zwgAmount,  debitFc: usdAmount },
        { accountId: ACC.feeRevUsd, creditLc: zwgAmount, creditFc: usdAmount },
      ],
    });
  }

  // ── 11. Student Invoices + Receipts (3 terms × 50 students) ──
  console.log("Student invoices & receipts...");
  const terms = [
    { label: "Term 1 2025", dueDate: d(2025,2,28), issueDate: d(2025,1,15), receiptDate: d(2025,2,10) },
    { label: "Term 2 2025", dueDate: d(2025,6,30), issueDate: d(2025,5,5),  receiptDate: d(2025,6,5)  },
    { label: "Term 3 2025", dueDate: d(2025,10,31),issueDate: d(2025,9,3),  receiptDate: d(2025,10,3) },
  ];
  const feeAmounts = [85000, 90000, 95000]; // ZWG per term

  let arNum = 2000;
  let rcptNum = 3000;

  for (const [ti, term] of terms.entries()) {
    for (const [si, studentId] of studentIds.entries()) {
      const amount = feeAmounts[ti];
      const paid = si % 5 === 0 ? 0 : si % 5 === 1 ? amount * 0.5 : amount; // 20% unpaid, 20% partial, 60% fully paid
      const balance = amount - paid;
      const stuNum = String(si+1).padStart(3,"0");

      // Invoice voucher
      const invNumber = `INV-${++arNum}`;
      const invVoucher = await prisma.voucher.create({
        data: {
          organisationId: ORG_ID,
          number: invNumber,
          type: "INVOICE",
          status: "POSTED",
          description: `${term.label} fees – STU${stuNum}`,
          date: term.issueDate,
          periodId: periodIdForDate(term.issueDate),
          createdById: BURSAR_ID,
          studentId,
        },
      });

      const invGlHeader = await prisma.gLHeader.create({
        data: {
          organisationId: ORG_ID,
          periodId: periodIdForDate(term.issueDate),
          voucherId: invVoucher.id,
          entryNumber: invVoucher.number,
          description: invVoucher.description,
          entryDate: term.issueDate,
        },
      });

      await prisma.gLEntry.createMany({
        data: [
          { glHeaderId: invGlHeader.id, lineNumber: 1, accountId: ACC.feesRecZwg, debitLc: amount, creditLc: 0, debitFc: 0, creditFc: 0, currencyCode: "ZWG", fxRate: 1, fundId: fundGeneral.id },
          { glHeaderId: invGlHeader.id, lineNumber: 2, accountId: ACC.feeRevZwg,  debitLc: 0, creditLc: amount, debitFc: 0, creditFc: 0, currencyCode: "ZWG", fxRate: 1, fundId: fundGeneral.id },
        ],
      });

      const arInvoice = await prisma.aRInvoice.create({
        data: {
          organisationId: ORG_ID,
          voucherId: invVoucher.id,
          studentId,
          currencyCode: "ZWG",
          term: term.label,
          status: "POSTED",
          amount,
          balance,
          dueDate: term.dueDate,
        },
      });

      await prisma.aRInvoiceLine.create({
        data: {
          invoiceId: arInvoice.id,
          description: `${term.label} tuition fees`,
          quantity: 1,
          unitPrice: amount,
          amount,
        },
      });

      if (paid > 0) {
        const rcptNumber = `RCPT-${++rcptNum}`;
        const rcptVoucher = await prisma.voucher.create({
          data: {
            organisationId: ORG_ID,
            number: rcptNumber,
            type: "RECEIPT",
            status: "POSTED",
            description: `Payment – ${term.label} – STU${stuNum}`,
            date: term.receiptDate,
            periodId: periodIdForDate(term.receiptDate),
            createdById: BURSAR_ID,
            studentId,
          },
        });

        const rcptGlHeader = await prisma.gLHeader.create({
          data: {
            organisationId: ORG_ID,
            periodId: periodIdForDate(term.receiptDate),
            voucherId: rcptVoucher.id,
            entryNumber: rcptVoucher.number,
            description: rcptVoucher.description,
            entryDate: term.receiptDate,
          },
        });

        await prisma.gLEntry.createMany({
          data: [
            { glHeaderId: rcptGlHeader.id, lineNumber: 1, accountId: ACC.cash,       debitLc: paid, creditLc: 0, debitFc: 0, creditFc: 0, currencyCode: "ZWG", fxRate: 1, fundId: fundGeneral.id },
            { glHeaderId: rcptGlHeader.id, lineNumber: 2, accountId: ACC.feesRecZwg, debitLc: 0, creditLc: paid, debitFc: 0, creditFc: 0, currencyCode: "ZWG", fxRate: 1, fundId: fundGeneral.id },
          ],
        });

        const receipt = await prisma.aRReceipt.create({
          data: {
            organisationId: ORG_ID,
            voucherId: rcptVoucher.id,
            studentId,
            currencyCode: "ZWG",
            amount: paid,
            unallocated: 0,
            paymentMethod: ["CASH","ECOCASH","BANK_TRANSFER"][si % 3],
          },
        });

        await prisma.aRAllocation.create({
          data: {
            invoiceId: arInvoice.id,
            receiptId: receipt.id,
            amount: paid,
          },
        });
      }
    }
  }
  console.log(`  ${arNum - 2000} invoices, ${rcptNum - 3000} receipts created`);

  // ── 12. AP Bills + Payments ───────────────────────────────────
  console.log("AP bills & payments...");
  const apDefs = [
    // [supplierCode, months, amountZwg, description, accountId, costCentreCode, isUsd]
    ["SUP001", [1,4,7,10],   320000, "Office supplies",        ACC.supplies, "ADMIN",  false],
    ["SUP002", [1,2,3,4,5,6,7,8,9,10,11,12], 180000, "Catering services", ACC.otherExp, "ADMIN", false],
    ["SUP003", [2,5,8,11],   450000, "IT maintenance",         ACC.supplies, "ACAD",   false],
    ["SUP004", [1,3,5,7,9,11],240000, "Cleaning services",    ACC.otherExp, "MAINT",  false],
    ["SUP005", [6,12],      1800000, "Construction works",     ACC.otherExp, "MAINT",  false],
    ["SUP006", [1,2,3,4,5,6,7,8,9,10,11,12], 95000, "Electricity", ACC.otherExp, "MAINT", false],
    ["SUP007", [1,2,3,4,5,6,7,8,9,10,11,12], 42000, "Water",    ACC.otherExp, "MAINT",  false],
    ["SUP008", [3,9],        1200,   "Textbooks (USD)",        ACC.supplies, "ACAD",   true],  // USD bill
  ] as [string, number[], number, string, string, string, boolean][];

  let apNum = 4000;
  let payNum = 5000;

  for (const [supCode, months, amount, desc, accId, ccCode, isUsd] of apDefs) {
    const sup = suppliers[supCode];
    const cc = costCentres[ccCode];
    const currency = isUsd ? "USD" : "ZWG";
    const fxRate = isUsd ? 4200 : 1;
    const amountLc = isUsd ? amount * fxRate : amount;

    for (const month of months) {
      const billDate = d(2025, month, 10);
      const billNumber = `BILL-${++apNum}`;

      const billVoucher = await prisma.voucher.create({
        data: {
          organisationId: ORG_ID,
          number: billNumber,
          type: "BILL",
          status: "POSTED",
          description: `${desc} – ${sup.name}`,
          date: billDate,
          periodId: periodIdForDate(billDate),
          createdById: ADMIN_ID,
          supplierId: sup.id,
        },
      });

      const billGlHeader = await prisma.gLHeader.create({
        data: {
          organisationId: ORG_ID,
          periodId: periodIdForDate(billDate),
          voucherId: billVoucher.id,
          entryNumber: billVoucher.number,
          description: billVoucher.description,
          entryDate: billDate,
        },
      });

      await prisma.gLEntry.createMany({
        data: [
          { glHeaderId: billGlHeader.id, lineNumber: 1, accountId: accId, debitLc: amountLc, creditLc: 0, debitFc: isUsd ? amount : 0, creditFc: 0, currencyCode: currency, fxRate, costCentreId: cc.id, fundId: fundGeneral.id },
          { glHeaderId: billGlHeader.id, lineNumber: 2, accountId: isUsd ? ACC.tradePayUsd : ACC.tradePayable, debitLc: 0, creditLc: amountLc, debitFc: 0, creditFc: isUsd ? amount : 0, currencyCode: currency, fxRate, fundId: fundGeneral.id },
        ],
      });

      const bill = await prisma.aPBill.create({
        data: {
          organisationId: ORG_ID,
          voucherId: billVoucher.id,
          supplierId: sup.id,
          currencyCode: currency,
          amount: isUsd ? amount : amountLc,
          balance: month % 4 === 0 ? (isUsd ? amount : amountLc) : 0, // every 4th bill is outstanding
          dueDate: d(2025, month < 12 ? month + 1 : 12, 5),
        },
      });

      await prisma.aPBillLine.create({
        data: { billId: bill.id, description: desc, quantity: 1, unitPrice: isUsd ? amount : amountLc, amount: isUsd ? amount : amountLc },
      });

      // Payment for settled bills
      if (month % 4 !== 0) {
        const payDate = d(2025, Math.min(month + 1, 12), 15);
        const payNumber = `PAY-${++payNum}`;

        const payVoucher = await prisma.voucher.create({
          data: {
            organisationId: ORG_ID,
            number: payNumber,
            type: "PAYMENT",
            status: "POSTED",
            description: `Payment to ${sup.name} – ${desc}`,
            date: payDate,
            periodId: periodIdForDate(payDate),
            createdById: BURSAR_ID,
            supplierId: sup.id,
          },
        });

        const payGlHeader = await prisma.gLHeader.create({
          data: {
            organisationId: ORG_ID,
            periodId: periodIdForDate(payDate),
            voucherId: payVoucher.id,
            entryNumber: payVoucher.number,
            description: payVoucher.description,
            entryDate: payDate,
          },
        });

        await prisma.gLEntry.createMany({
          data: [
            { glHeaderId: payGlHeader.id, lineNumber: 1, accountId: isUsd ? ACC.tradePayUsd : ACC.tradePayable, debitLc: amountLc, creditLc: 0, debitFc: isUsd ? amount : 0, creditFc: 0, currencyCode: currency, fxRate, fundId: fundGeneral.id },
            { glHeaderId: payGlHeader.id, lineNumber: 2, accountId: ACC.cash, debitLc: 0, creditLc: amountLc, debitFc: 0, creditFc: isUsd ? amount : 0, currencyCode: currency, fxRate, fundId: fundGeneral.id },
          ],
        });

        const payment = await prisma.aPPayment.create({
          data: {
            organisationId: ORG_ID,
            voucherId: payVoucher.id,
            supplierId: sup.id,
            currencyCode: currency,
            amount: isUsd ? amount : amountLc,
            unallocated: 0,
          },
        });

        await prisma.aPAllocation.create({
          data: { billId: bill.id, paymentId: payment.id, amount: isUsd ? amount : amountLc },
        });
      }
    }
  }
  console.log(`  ${apNum - 4000} AP bills, ${payNum - 5000} payments created`);

  // ── 13. Inventory Movements (12 months) ──────────────────────
  console.log("Inventory movements...");

  const initialStock: Record<string, { qty: number; cost: number }> = {
    [ITEMS.paper]:    { qty: 0, cost: 1200 },
    [ITEMS.pens]:     { qty: 0, cost: 850 },
    [ITEMS.markers]:  { qty: 0, cost: 650 },
    [ITEMS.staples]:  { qty: 0, cost: 320 },
    [ITEMS.foolscap]: { qty: 0, cost: 950 },
    [ITEMS.toner]:    { qty: 0, cost: 18500 },
  };

  type MovementEntry = { itemId: string; type: "RECEIPT" | "ISSUE"; qty: number; month: number; day: number };
  const movements: MovementEntry[] = [
    // Paper (quarterly receipts + monthly issues)
    { itemId: ITEMS.paper,    type: "RECEIPT", qty: 50,  month: 1, day: 5 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 10,  month: 1, day: 20 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 8,   month: 2, day: 15 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 12,  month: 3, day: 10 },
    { itemId: ITEMS.paper,    type: "RECEIPT", qty: 60,  month: 4, day: 3 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 9,   month: 4, day: 25 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 11,  month: 5, day: 18 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 7,   month: 6, day: 12 },
    { itemId: ITEMS.paper,    type: "RECEIPT", qty: 40,  month: 7, day: 4 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 10,  month: 7, day: 28 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 8,   month: 8, day: 22 },
    { itemId: ITEMS.paper,    type: "RECEIPT", qty: 55,  month: 9, day: 6 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 13,  month: 10, day: 14 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 9,   month: 11, day: 19 },
    { itemId: ITEMS.paper,    type: "ISSUE",   qty: 11,  month: 12, day: 8 },
    // Pens
    { itemId: ITEMS.pens,     type: "RECEIPT", qty: 20,  month: 1, day: 6 },
    { itemId: ITEMS.pens,     type: "ISSUE",   qty: 5,   month: 2, day: 10 },
    { itemId: ITEMS.pens,     type: "ISSUE",   qty: 4,   month: 3, day: 15 },
    { itemId: ITEMS.pens,     type: "RECEIPT", qty: 30,  month: 5, day: 7 },
    { itemId: ITEMS.pens,     type: "ISSUE",   qty: 6,   month: 5, day: 28 },
    { itemId: ITEMS.pens,     type: "ISSUE",   qty: 5,   month: 7, day: 11 },
    { itemId: ITEMS.pens,     type: "RECEIPT", qty: 25,  month: 9, day: 8 },
    { itemId: ITEMS.pens,     type: "ISSUE",   qty: 7,   month: 10, day: 20 },
    // Toner (expensive, less frequent)
    { itemId: ITEMS.toner,    type: "RECEIPT", qty: 6,   month: 1, day: 8 },
    { itemId: ITEMS.toner,    type: "ISSUE",   qty: 2,   month: 2, day: 5 },
    { itemId: ITEMS.toner,    type: "ISSUE",   qty: 2,   month: 5, day: 9 },
    { itemId: ITEMS.toner,    type: "RECEIPT", qty: 4,   month: 6, day: 3 },
    { itemId: ITEMS.toner,    type: "ISSUE",   qty: 1,   month: 8, day: 14 },
    { itemId: ITEMS.toner,    type: "ISSUE",   qty: 2,   month: 10, day: 7 },
    // Markers
    { itemId: ITEMS.markers,  type: "RECEIPT", qty: 30,  month: 1, day: 9 },
    { itemId: ITEMS.markers,  type: "ISSUE",   qty: 8,   month: 2, day: 20 },
    { itemId: ITEMS.markers,  type: "ISSUE",   qty: 6,   month: 4, day: 18 },
    { itemId: ITEMS.markers,  type: "RECEIPT", qty: 20,  month: 7, day: 5 },
    { itemId: ITEMS.markers,  type: "ISSUE",   qty: 7,   month: 8, day: 16 },
    { itemId: ITEMS.markers,  type: "ISSUE",   qty: 5,   month: 11, day: 12 },
    // Foolscap
    { itemId: ITEMS.foolscap, type: "RECEIPT", qty: 40,  month: 2, day: 4 },
    { itemId: ITEMS.foolscap, type: "ISSUE",   qty: 10,  month: 3, day: 8 },
    { itemId: ITEMS.foolscap, type: "ISSUE",   qty: 8,   month: 5, day: 22 },
    { itemId: ITEMS.foolscap, type: "RECEIPT", qty: 35,  month: 8, day: 7 },
    { itemId: ITEMS.foolscap, type: "ISSUE",   qty: 12,  month: 9, day: 18 },
    { itemId: ITEMS.foolscap, type: "ISSUE",   qty: 9,   month: 11, day: 25 },
  ];

  let invMoveCount = 0;
  for (const mv of movements) {
    const item = initialStock[mv.itemId];
    const isReceipt = mv.type === "RECEIPT";

    if (!isReceipt && item.qty < mv.qty) {
      console.log(`  Skipping ISSUE for ${mv.itemId} (insufficient stock: ${item.qty} < ${mv.qty})`);
      continue;
    }

    const newQty = isReceipt ? item.qty + mv.qty : item.qty - mv.qty;
    const newValue = newQty * item.cost;
    item.qty = newQty;

    await prisma.inventoryMovement.create({
      data: {
        organisationId: ORG_ID,
        itemId: mv.itemId,
        movementType: mv.type,
        movementDate: d(2025, mv.month, mv.day),
        quantity: isReceipt ? mv.qty : -mv.qty,
        unitCost: item.cost,
        totalCost: mv.qty * item.cost,
        balanceQty: newQty,
        balanceValue: newValue,
        issuedTo: !isReceipt ? ["Form 1A", "Form 2B", "Form 3C", "Admin Office"][mv.month % 4] : undefined,
        notes: isReceipt ? "Quarterly stock receipt" : "Issued to department",
        createdById: ADMIN_ID,
      },
    });

    await prisma.inventoryItem.update({
      where: { id: mv.itemId },
      data: { quantityOnHand: newQty, averageCost: item.cost },
    });

    invMoveCount++;
  }
  console.log(`  ${invMoveCount} inventory movements created`);

  // ── 14. Final count ───────────────────────────────────────────
  const [vCount, glCount, arCount, apCount, invCount] = await Promise.all([
    prisma.voucher.count({ where: { organisationId: ORG_ID } }),
    prisma.gLEntry.count(),
    prisma.aRInvoice.count({ where: { organisationId: ORG_ID } }),
    prisma.aPBill.count({ where: { organisationId: ORG_ID } }),
    prisma.inventoryMovement.count({ where: { organisationId: ORG_ID } }),
  ]);

  console.log("\n✅ Phase 4 seed complete!");
  console.log(`   Vouchers:          ${vCount}`);
  console.log(`   GL Entries:        ${glCount}`);
  console.log(`   AR Invoices:       ${arCount}`);
  console.log(`   AP Bills:          ${apCount}`);
  console.log(`   Inventory Moves:   ${invCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
