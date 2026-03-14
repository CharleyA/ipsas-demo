import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
    return withAuth(req, async (authReq) => {
      try {
        const { organisationId } = authReq.user;

        // Fetch all SUBMITTED vouchers for the organisation
        // This ensures the inbox matches the dashboard count and is accurate
        const vouchers = await prisma.voucher.findMany({
          where: {
            organisationId,
            status: "SUBMITTED",
          },
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            approvals: {
              where: {
                userId: authReq.user.userId,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Map vouchers to a "task" format expected by the frontend
        // We look for a task assigned to the current user, or create a mock one
        const tasks = vouchers.map(voucher => {
          const userTask = voucher.approvals[0];
          return {
            id: userTask?.id || `mock-${voucher.id}`,
            voucherId: voucher.id,
            userId: authReq.user.userId,
            status: userTask?.status || "PENDING",
            createdAt: voucher.createdAt,
            voucher: {
              id: voucher.id,
              number: voucher.number,
              type: voucher.type,
              date: voucher.date,
              description: voucher.description,
              createdBy: voucher.createdBy,
            }
          };
        });

        return NextResponse.json(tasks);
      } catch (error: any) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }, ["HEADMASTER", "BURSAR", "ADMIN"]);
}
