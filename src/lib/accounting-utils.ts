import { Prisma } from "@prisma/client";

const Decimal = Prisma.Decimal;

export const LC_BALANCE_TOLERANCE = new Decimal("0.01");
export const LC_DECIMALS = 2;
export const FC_DECIMALS = 4;
export const FX_DECIMALS = 8;

export function roundToDecimals(value: Prisma.Decimal | number | string, decimals: number): Prisma.Decimal {
  const d = new Decimal(value);
  return d.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

export function roundFc(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return roundToDecimals(value, FC_DECIMALS);
}

export function roundLc(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return roundToDecimals(value, LC_DECIMALS);
}

export function computeLcAmount(fc: Prisma.Decimal | number | string, fxRate: Prisma.Decimal | number | string): Prisma.Decimal {
  const fcAmount = new Decimal(fc);
  const rate = new Decimal(fxRate);
  return roundLc(fcAmount.mul(rate));
}

export interface VoucherLineAmounts {
  debitFc: Prisma.Decimal | null;
  creditFc: Prisma.Decimal | null;
  debitLc: Prisma.Decimal | null;
  creditLc: Prisma.Decimal | null;
  amountFc: Prisma.Decimal | null;
  amountLc: Prisma.Decimal | null;
  fxRate: Prisma.Decimal;
}

export function computeLineAmounts(
  debit: number | string | null | undefined,
  credit: number | string | null | undefined,
  fxRate: number | string
): VoucherLineAmounts {
  const rate = new Decimal(fxRate);
  
  const debitFc = debit ? roundFc(debit) : null;
  const creditFc = credit ? roundFc(credit) : null;
  
  const debitLc = debitFc ? roundLc(debitFc.mul(rate)) : null;
  const creditLc = creditFc ? roundLc(creditFc.mul(rate)) : null;
  
  const amountFc = debitFc ?? creditFc;
  const amountLc = debitLc ?? creditLc;

  return {
    debitFc,
    creditFc,
    debitLc,
    creditLc,
    amountFc,
    amountLc,
    fxRate: rate,
  };
}

export interface BalanceCheckResult {
  totalDebitLc: Prisma.Decimal;
  totalCreditLc: Prisma.Decimal;
  difference: Prisma.Decimal;
  isBalanced: boolean;
}

export function checkDoubleEntryBalance(lines: { debitLc?: Prisma.Decimal | null; creditLc?: Prisma.Decimal | null }[]): BalanceCheckResult {
  let totalDebitLc = new Decimal(0);
  let totalCreditLc = new Decimal(0);

  for (const line of lines) {
    if (line.debitLc) totalDebitLc = totalDebitLc.add(line.debitLc);
    if (line.creditLc) totalCreditLc = totalCreditLc.add(line.creditLc);
  }

  const difference = totalDebitLc.sub(totalCreditLc).abs();
  const isBalanced = difference.lte(LC_BALANCE_TOLERANCE);

  return {
    totalDebitLc,
    totalCreditLc,
    difference,
    isBalanced,
  };
}

export function validateDoubleEntry(lines: { debit?: number | string | null; credit?: number | string | null; fxRate: number | string }[]): void {
  const computedLines = lines.map(line => computeLineAmounts(line.debit, line.credit, line.fxRate));
  const result = checkDoubleEntryBalance(computedLines);
  
  if (!result.isBalanced) {
    throw new Error(
      `Double-entry violation: Debits (${result.totalDebitLc.toFixed(LC_DECIMALS)} LC) must equal Credits (${result.totalCreditLc.toFixed(LC_DECIMALS)} LC). Difference: ${result.difference.toFixed(LC_DECIMALS)} LC exceeds tolerance of ${LC_BALANCE_TOLERANCE.toString()}`
    );
  }
}

export function isPostedStatus(status: string): boolean {
  return status === "POSTED";
}

export function isImmutableStatus(status: string): boolean {
  return ["POSTED", "REVERSED"].includes(status);
}

export function canEditVoucher(status: string): boolean {
  return status === "DRAFT";
}

export function canReverseVoucher(status: string): boolean {
  return status === "POSTED";
}
