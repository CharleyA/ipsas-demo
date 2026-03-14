import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const authContext = await verifyAuth(req);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const funds = await prisma.fund.findMany({
      where: {
        organisationId: authContext.organisationId,
        isActive: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    return NextResponse.json(funds);
  } catch (error: any) {
    console.error("Error fetching funds:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
