import { z } from "zod";

export const OrganisationType = z.enum([
  "PRIMARY_SCHOOL",
  "SECONDARY_SCHOOL",
  "COMBINED_SCHOOL",
  "MINISTRY",
  "DEPARTMENT",
  "LOCAL_AUTHORITY",
]);

export const UserRole = z.enum(["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR", "VIEWER"]);

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
  type: z.enum(["JOURNAL", "RECEIPT", "PAYMENT", "INVOICE", "BILL", "CASHBOOK"]),
  periodId: z.string().cuid(),
  date: z.string().datetime().or(z.date()),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(voucherLineSchema).min(1),
});

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
