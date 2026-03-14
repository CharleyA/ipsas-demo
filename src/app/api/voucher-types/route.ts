import prisma from "@/lib/db";
import { createVoucherTypeSchema } from "@/lib/validations/schemas";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, requireAuth } from "@/lib/api-utils";

export async function GET() {
  try {
    const voucherTypes = await prisma.voucherType.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    return successResponse(voucherTypes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    
    if (action === "seed") {
      const defaultTypes = [
        { code: "PV", name: "Payment Voucher", prefix: "PV", description: "Cash/bank payments" },
        { code: "RV", name: "Receipt Voucher", prefix: "RV", description: "Cash/bank receipts" },
        { code: "JV", name: "Journal Voucher", prefix: "JV", description: "General journal entries" },
        { code: "CV", name: "Contra Voucher", prefix: "CV", description: "Bank to bank transfers" },
        { code: "DM", name: "Debit Memo", prefix: "DM", description: "Debit adjustments" },
        { code: "CM", name: "Credit Memo", prefix: "CM", description: "Credit adjustments" },
      ];
      
      await prisma.voucherType.createMany({
        data: defaultTypes,
        skipDuplicates: true,
      });
      
      const types = await prisma.voucherType.findMany({ orderBy: { code: "asc" } });
      return successResponse(types, 201);
    }
    
    const body = await request.json();
    const data = createVoucherTypeSchema.parse(body);
    
    const voucherType = await prisma.voucherType.create({ data });
    return successResponse(voucherType, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
