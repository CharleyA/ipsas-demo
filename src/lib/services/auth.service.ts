import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "@/lib/db";
import { LoginInput } from "@/lib/validations/schemas";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

export class AuthService {
  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { organisation: true },
    });

    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        organisationId: user.organisationId 
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organisationId: user.organisationId,
        organisation: user.organisation,
      },
    };
  }

  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return null;
    }
  }

  static async me(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { organisation: true },
    });
  }
}
