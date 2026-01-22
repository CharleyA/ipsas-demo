import { NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notification.service";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await NotificationService.markAsRead(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
