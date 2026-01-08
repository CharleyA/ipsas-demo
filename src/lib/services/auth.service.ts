import bcrypt from "bcrypt";
import prisma from "@/lib/db";
import { LoginInput } from "@/lib/validations/schemas";
import { signToken } from "@/lib/auth";

export class AuthService {
  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { 
        organisations: {
          where: { isActive: true },
          include: { organisation: true },
          take: 1
        }
      },
    });

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    const activeOrgUser = user.organisations[0];
    if (!activeOrgUser) {
      throw new Error("User is not associated with any active organisation");
    }

    const payload = { 
      userId: user.id, 
      email: user.email, 
      role: activeOrgUser.role, 
      organisationId: activeOrgUser.organisationId 
    };

    const token = signToken(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: activeOrgUser.role,
        organisationId: activeOrgUser.organisationId,
        organisation: activeOrgUser.organisation,
      },
    };
  }

  static async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        organisations: {
          where: { isActive: true },
          include: { organisation: true },
          take: 1
        }
      },
    });

    if (!user) return null;

    const activeOrgUser = user.organisations[0];
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: activeOrgUser?.role || null,
      organisationId: activeOrgUser?.organisationId || null,
      organisation: activeOrgUser?.organisation || null,
    };
  }
}
