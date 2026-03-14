import { z } from "zod";

export const OrganisationType = z.enum([
  "PRIMARY_SCHOOL",
  "SECONDARY_SCHOOL",
  "COMBINED_SCHOOL",
  "MINISTRY",
  "DEPARTMENT",
  "LOCAL_AUTHORITY",
]);

export const UserRole = z.enum(["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT", "TEACHER"]);

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
  arReceivableAccountId: z.string().nullable().optional(),
  arRevenueAccountId: z.string().nullable().optional(),
  arBankAccountId: z.string().nullable().optional(),
  apPayableAccountId: z.string().nullable().optional(),
  apExpenseAccountId: z.string().nullable().optional(),
  apBankAccountId: z.string().nullable().optional(),
  cashInHandAccountId: z.string().nullable().optional(),
  fxBankAccountId: z.string().nullable().optional(),
  fxGainLossAccountId: z.string().nullable().optional(),
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

export const updateCurrencySchema = createCurrencySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createExchangeRateSchema = z.object({
  fromCurrencyCode: z.string().length(3),
  toCurrencyCode: z.string().length(3),
  rate: z.number().positive(),
  effectiveDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
  source: z.string().max(100).optional(),
});

export const createAccountSchema = z.object({
  organisationId: z.string(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: AccountType,
  parentId: z.string().optional(),
  description: z.string().max(500).optional(),
  isSystemAccount: z.boolean().default(false),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createAccountingPeriodSchema = z.object({
  organisationId: z.string(),
  year: z.number().int().min(2000).max(2100),
  period: z.number().int().min(1).max(12),
  name: z.string().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createFiscalPeriodSchema = createAccountingPeriodSchema;

export const approveVoucherSchema = z.object({
  approvalNotes: z.string().max(500).optional(),
});

export const rejectVoucherSchema = z.object({
  rejectionReason: z.string().min(1).max(500),
});

export const createVoucherTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  prefix: z.string().min(1).max(10).optional(),
  description: z.string().max(500).optional(),
});

export const voucherLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  description: z.string().max(500).optional(),
  accountId: z.string(),
  costCentreId: z.string().optional(),
  fundId: z.string().optional(),
  programmeId: z.string().optional(),
  projectId: z.string().optional(),
  currencyCode: z.string().length(3),
  amountFc: z.number(),
  fxRate: z.number().positive(),
  amountLc: z.number(),
  debit: z.number().optional(),
  credit: z.number().optional(),
});

export const createVoucherSchema = z.object({
  organisationId: z.string(),
  type: z.enum(["JOURNAL", "RECEIPT", "PAYMENT", "INVOICE", "BILL", "CASHBOOK", "AR_INVOICE", "AR_RECEIPT", "AP_BILL", "AP_PAYMENT"]),
  periodId: z.string(),
  date: z.coerce.date(),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  studentId: z.string().optional(),
  supplierId: z.string().optional(),
  lines: z.array(voucherLineSchema).min(1),
});

export const arInvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const createARInvoiceSchema = z.object({
  organisationId: z.string(),
  studentId: z.string(),
  currencyCode: z.string().length(3),
  term: z.string().optional(),
  fundId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.coerce.date(),
  lines: z.array(arInvoiceLineSchema).min(1),
  description: z.string().optional(),
});

export const createARReceiptSchema = z.object({
  organisationId: z.string(),
  studentId: z.string(),
  currencyCode: z.string().length(3),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  date: z.coerce.date(),
  bankAccountId: z.string(), // The bank/cash account to DR
});

export const allocateARReceiptSchema = z.object({
  receiptId: z.string(),
  allocations: z.array(z.object({
    invoiceId: z.string(),
    amount: z.number().positive(),
  })),
});

export type CreateARInvoiceInput = z.infer<typeof createARInvoiceSchema>;
export type CreateARReceiptInput = z.infer<typeof createARReceiptSchema>;
export type AllocateARReceiptInput = z.infer<typeof allocateARReceiptSchema>;


export const updateVoucherSchema = z.object({
  date: z.coerce.date().optional(),
  description: z.string().min(1).max(500).optional(),
  reference: z.string().max(100).optional(),
  lines: z.array(voucherLineSchema).min(1).optional(),
});

export const auditLogSchema = z.object({
  userId: z.string(),
  organisationId: z.string().optional(),
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
  accountId: z.string(),
});

export const createAPBillSchema = z.object({
  organisationId: z.string(),
  supplierId: z.string(),
  currencyCode: z.string().length(3),
  fundId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.coerce.date(),
  lines: z.array(apBillLineSchema).min(1),
  description: z.string().optional(),
});

export const createAPPaymentSchema = z.object({
  organisationId: z.string(),
  supplierId: z.string(),
  currencyCode: z.string().length(3),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  date: z.coerce.date(),
  bankAccountId: z.string(),
});

export const allocateAPPaymentSchema = z.object({
  paymentId: z.string(),
  allocations: z.array(z.object({
    billId: z.string(),
    amount: z.number().positive(),
  })),
});

export const createStudentSchema = z.object({
  organisationId: z.string(),
  studentNumber: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  grade: z.string().max(20).optional(),
  class: z.string().max(20).optional(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  parentName: z.string().max(200).optional(),
  parentPhone: z.string().max(20).optional(),
  parentEmail: z.string().email().optional(),
  enrollmentDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const createSupplierSchema = z.object({
  organisationId: z.string(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  taxNumber: z.string().max(50).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAPBillInput = z.infer<typeof createAPBillSchema>;
export type CreateAPPaymentInput = z.infer<typeof createAPPaymentSchema>;
export type AllocateAPPaymentInput = z.infer<typeof allocateAPPaymentSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export const createGuardianSchema = z.object({
  organisationId: z.string(),
  fullName: z.string().min(1).max(200),
  relationship: z.string().min(1).max(100),
  primaryPhone: z.string().min(1).max(30),
  secondaryPhone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  email: z.string().email().optional(),
  studentIds: z.array(z.string()).optional(),
  isPrimaryContact: z.boolean().optional(),
  isBillingContact: z.boolean().optional(),
});

export const updateGuardianSchema = createGuardianSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const linkGuardianSchema = z.object({
  guardianId: z.string(),
  isPrimaryContact: z.boolean().optional(),
  isBillingContact: z.boolean().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;

export const addUserToOrganisationSchema = z.object({
  userId: z.string().min(1),
  organisationId: z.string().min(1),
  role: UserRole,
  isApprover: z.boolean().default(false),
});

export const updateOrganisationUserSchema = z.object({
  role: UserRole.optional(),
  isApprover: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

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
  bankAccountId: z.string(),
  filename: z.string(),
  rows: z.array(bankImportRowSchema),
});

export const matchBankRowSchema = z.object({
  rowId: z.string(),
  voucherId: z.string(),
});

export const createCashbookEntrySchema = z.object({
  organisationId: z.string(),
  bankAccountId: z.string(),
  type: z.enum(["RECEIPT", "PAYMENT"]),
  date: z.coerce.date(),
  description: z.string(),
  reference: z.string().optional(),
  amount: z.number().positive(),
  currencyCode: z.string().length(3),
  fxRate: z.number().positive(),
  studentId: z.string().optional(),
  supplierId: z.string().optional(),
  costCentreId: z.string().optional(),
  fundId: z.string().optional(),
  accountId: z.string(),
});

export type BankImportRowInput = z.infer<typeof bankImportRowSchema>;
export type CreateBankImportInput = z.infer<typeof createBankImportSchema>;
export type MatchBankRowInput = z.infer<typeof matchBankRowSchema>;
export type CreateCashbookEntryInput = z.infer<typeof createCashbookEntrySchema>;
