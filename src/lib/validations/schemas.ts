import { z } from "zod";

export const OrganisationType = z.enum([
  "PRIMARY_SCHOOL",
  "SECONDARY_SCHOOL",
  "COMBINED_SCHOOL",
  "MINISTRY",
  "DEPARTMENT",
  "LOCAL_AUTHORITY",
]);

export const UserRole = z.enum(["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR"]);

export const AccountType = z.enum([
  "ASSET",
  "LIABILITY",
  "NET_ASSETS_EQUITY",
  "REVENUE",
  "EXPENSE",
]);

export const VoucherStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "POSTED",
  "REVERSED",
  "REJECTED",
  "CANCELLED",
]);

export const createOrganisationSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(200),
  type: OrganisationType,
  baseCurrency: z.string().length(3).default("ZWG"),
  fiscalYearStart: z.number().int().min(1).max(12).default(1),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
});

export const updateOrganisationSchema = createOrganisationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const createCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  decimals: z.number().int().min(0).max(8).default(2),
});

export const createExchangeRateSchema = z.object({
  fromCurrencyCode: z.string().length(3),
  toCurrencyCode: z.string().length(3),
  rate: z.number().positive(),
  effectiveDate: z.string().datetime().or(z.date()),
  source: z.string().max(100).optional(),
});

export const createAccountSchema = z.object({
  organisationId: z.string().cuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: AccountType,
  parentId: z.string().cuid().optional(),
  description: z.string().max(500).optional(),
  isSystemAccount: z.boolean().default(false),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createAccountingPeriodSchema = z.object({
  organisationId: z.string().cuid(),
  year: z.number().int().min(2000).max(2100),
  period: z.number().int().min(1).max(12),
  name: z.string().min(1).max(100),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
});

export const voucherLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  description: z.string().max(500).optional(),
  accountId: z.string().cuid(),
  costCentreId: z.string().cuid().optional(),
  fundId: z.string().cuid().optional(),
  programmeId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  currencyCode: z.string().length(3),
  amountFc: z.number(),
  fxRate: z.number().positive(),
  amountLc: z.number(),
  debit: z.number().optional(),
  credit: z.number().optional(),
});

export const createVoucherSchema = z.object({
  organisationId: z.string().cuid(),
  type: z.enum(["JOURNAL", "RECEIPT", "PAYMENT", "INVOICE", "BILL", "CASHBOOK", "AR_INVOICE", "AR_RECEIPT", "AP_BILL", "AP_PAYMENT"]),
  periodId: z.string().cuid(),
  date: z.string().datetime().or(z.date()),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(voucherLineSchema).min(1),
});

export const arInvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const createARInvoiceSchema = z.object({
  organisationId: z.string().cuid(),
  studentId: z.string().cuid(),
  currencyCode: z.string().length(3),
  term: z.string().optional(),
  dueDate: z.string().datetime().or(z.date()),
  lines: z.array(arInvoiceLineSchema).min(1),
  description: z.string().optional(),
});

export const createARReceiptSchema = z.object({
  organisationId: z.string().cuid(),
  studentId: z.string().cuid(),
  currencyCode: z.string().length(3),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().datetime().or(z.date()),
  bankAccountId: z.string().cuid(), // The bank/cash account to DR
});

export const allocateARReceiptSchema = z.object({
  receiptId: z.string().cuid(),
  allocations: z.array(z.object({
    invoiceId: z.string().cuid(),
    amount: z.number().positive(),
  })),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  parentName: z.string().max(200).optional(),
  parentPhone: z.string().max(20).optional(),
  parentEmail: z.string().email().optional(),
  enrollmentDate: z.string().datetime().or(z.date()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateARInvoiceInput = z.infer<typeof createARInvoiceSchema>;
export type CreateARReceiptInput = z.infer<typeof createARReceiptSchema>;
export type AllocateARReceiptInput = z.infer<typeof allocateARReceiptSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;


export const updateVoucherSchema = z.object({
  date: z.string().datetime().or(z.date()).optional(),
  description: z.string().min(1).max(500).optional(),
  reference: z.string().max(100).optional(),
  lines: z.array(voucherLineSchema).min(1).optional(),
});

export const auditLogSchema = z.object({
  userId: z.string().cuid(),
  organisationId: z.string().cuid().optional(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  oldValues: z.any().optional(),
  newValues: z.any().optional(),
});

export const apBillLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  accountId: z.string().cuid(),
});

export const createAPBillSchema = z.object({
  organisationId: z.string().cuid(),
  supplierId: z.string().cuid(),
  currencyCode: z.string().length(3),
  dueDate: z.string().datetime().or(z.date()),
  lines: z.array(apBillLineSchema).min(1),
  description: z.string().optional(),
});

export const createAPPaymentSchema = z.object({
  organisationId: z.string().cuid(),
  supplierId: z.string().cuid(),
  currencyCode: z.string().length(3),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().datetime().or(z.date()),
  bankAccountId: z.string().cuid(),
});

export const allocateAPPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  allocations: z.array(z.object({
    billId: z.string().cuid(),
    amount: z.number().positive(),
  })),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAPBillInput = z.infer<typeof createAPBillSchema>;
export type CreateAPPaymentInput = z.infer<typeof createAPPaymentSchema>;
export type AllocateAPPaymentInput = z.infer<typeof allocateAPPaymentSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const createStudentSchema = z.object({
  organisationId: z.string().cuid(),
  studentNumber: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  grade: z.string().max(20).optional(),
});

export const createSupplierSchema = z.object({
  organisationId: z.string().cuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  taxNumber: z.string().max(50).optional(),
});

export const addUserToOrganisationSchema = z.object({
  userId: z.string().cuid(),
  organisationId: z.string().cuid(),
  role: UserRole,
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;
export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateAccountingPeriodInput = z.infer<typeof createAccountingPeriodSchema>;
export type VoucherLineInput = z.infer<typeof voucherLineSchema>;
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;
export type AddUserToOrganisationInput = z.infer<typeof addUserToOrganisationSchema>;

export const bankImportRowSchema = z.object({
  date: z.string().or(z.date()),
  description: z.string(),
  reference: z.string().optional(),
  debit: z.number().optional(),
  credit: z.number().optional(),
  balance: z.number().optional(),
});

export const createBankImportSchema = z.object({
  bankAccountId: z.string().cuid(),
  filename: z.string(),
  rows: z.array(bankImportRowSchema),
});

export const matchBankRowSchema = z.object({
  rowId: z.string().cuid(),
  voucherId: z.string().cuid(),
});

export const createCashbookEntrySchema = z.object({
  organisationId: z.string().cuid(),
  bankAccountId: z.string().cuid(),
  type: z.enum(["RECEIPT", "PAYMENT"]),
  date: z.string().or(z.date()),
  description: z.string(),
  reference: z.string().optional(),
  amount: z.number().positive(),
  currencyCode: z.string().length(3),
  fxRate: z.number().positive(),
  studentId: z.string().cuid().optional(),
  supplierId: z.string().cuid().optional(),
  costCentreId: z.string().cuid().optional(),
  fundId: z.string().cuid().optional(),
  accountId: z.string().cuid(),
});

export type BankImportRowInput = z.infer<typeof bankImportRowSchema>;
export type CreateBankImportInput = z.infer<typeof createBankImportSchema>;
export type MatchBankRowInput = z.infer<typeof matchBankRowSchema>;
export type CreateCashbookEntryInput = z.infer<typeof createCashbookEntrySchema>;
