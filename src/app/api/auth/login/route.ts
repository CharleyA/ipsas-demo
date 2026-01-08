import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { loginSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);
    
    const result = await AuthService.login(validatedData);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Invalid credentials" },
      { status: 401 }
    );
  }
}
