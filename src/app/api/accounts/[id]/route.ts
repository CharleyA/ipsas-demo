import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    const { id } = await params;
    const account = await prisma.account.findUnique({
      where: {
        id: id,
        organisationId: authReq.user.organisationId,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      const body = await authReq.json();
      
      // Prevent changing organisationId
      delete body.organisationId;

      const account = await prisma.account.update({
        where: {
          id: id,
          organisationId: authReq.user.organisationId,
        },
        data: body,
      });

      return NextResponse.json(account);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT"]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authReq) => {
    try {
      const { id } = await params;
      // Check for transactions
      const [glEntries, voucherLines, children] = await Promise.all([
        prisma.glEntry.count({ where: { accountId: id } }),
        prisma.voucherLine.count({ where: { accountId: id } }),
        prisma.account.count({ where: { parentId: id } }),
      ]);

      if (glEntries > 0 || voucherLines > 0) {
        return NextResponse.json(
          { error: "Cannot delete account with existing transactions" },
          { status: 400 }
        );
      }

      if (children > 0) {
        return NextResponse.json(
          { error: "Cannot delete account with sub-accounts. Please delete children first." },
          { status: 400 }
        );
      }

      const account = await prisma.account.findUnique({
        where: { id: id },
      });

      if (account?.isSystemAccount) {
        return NextResponse.json(
          { error: "Cannot delete system protected accounts" },
          { status: 400 }
        );
      }

      await prisma.account.delete({
        where: {
          id: id,
          organisationId: authReq.user.organisationId,
        },
      });

      return NextResponse.json({ message: "Account deleted successfully" });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }, ["ADMIN", "ACCOUNTANT"]);
}
