import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const accounts = await prisma.account.findMany({
      where: { organisationId: authReq.user.organisationId },
      orderBy: { code: "asc" },
      include: { children: true },
    });
    return NextResponse.json(accounts);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const account = await prisma.account.create({
        data: {
          ...body,
          organisationId: authReq.user.organisationId,
        },
      });
      return NextResponse.json(account, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT"]);
}
