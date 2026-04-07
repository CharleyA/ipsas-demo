import { NextResponse } from "next/server";

// VoucherType is an enum on the Voucher model, not a separate model.
// Return the enum values as a static list.
const VOUCHER_TYPES = [
  { code: "JOURNAL", name: "Journal Voucher", description: "General journal entries" },
  { code: "INVOICE", name: "Invoice", description: "AR student invoices" },
  { code: "RECEIPT", name: "Receipt", description: "AR cash/bank receipts" },
  { code: "BILL", name: "Bill", description: "AP supplier bills" },
  { code: "PAYMENT", name: "Payment", description: "AP supplier payments" },
];

export async function GET() {
  return NextResponse.json(VOUCHER_TYPES);
}
