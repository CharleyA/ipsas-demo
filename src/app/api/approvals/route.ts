import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const tasks = await prisma.approvalTask.findMany({
        where: {
          userId: authReq.user.userId,
          status: "PENDING",
        },
        include: {
          voucher: {
            include: {
              createdBy: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(tasks);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }, ["HEADMASTER", "BURSAR", "ADMIN"]);
}
