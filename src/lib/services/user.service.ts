import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import type { CreateUserInput, UpdateUserInput, AddUserToOrganisationInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class UserService {
  static async create(data: CreateUserInput) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        organisations: {
          include: {
            organisation: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
        },
      },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async update(id: string, data: UpdateUserInput, actorId: string) {
    const oldUser = await prisma.user.findUnique({ where: { id } });
    
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      oldValues: oldUser,
      newValues: user,
    });

    return user;
  }

  static async changePassword(id: string, newPassword: string, actorId: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await AuditService.log({
      userId: actorId,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: id,
    });

    return { success: true };
  }

  static async delete(id: string, actorId: string) {
    const oldUser = await prisma.user.findUnique({ where: { id } });
    
    // First remove from all organisations to handle relations
    await prisma.organisationUser.deleteMany({
      where: { userId: id },
    });

    const user = await prisma.user.delete({
      where: { id },
    });

    await AuditService.log({
      userId: actorId,
      action: "DELETE",
      entityType: "User",
      entityId: id,
      oldValues: oldUser,
    });

    return user;
  }

  static async verifyPassword(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  static async updateOrganisationUser(organisationId: string, userId: string, data: { role?: any; isApprover?: boolean; isActive?: boolean }, actorId: string) {
    const oldOrgUser = await prisma.organisationUser.findUnique({
      where: {
        organisationId_userId: { organisationId, userId },
      },
    });

    if (!oldOrgUser) throw new Error("User not found in this organisation");

    const orgUser = await prisma.organisationUser.update({
      where: {
        organisationId_userId: { organisationId, userId },
      },
      data,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "UPDATE_USER_ORG_SETTINGS",
      entityType: "OrganisationUser",
      entityId: orgUser.id,
      oldValues: oldOrgUser,
      newValues: orgUser,
    });

    return orgUser;
  }

  static async listByOrganisation(organisationId: string) {
    const orgUsers = await prisma.organisationUser.findMany({
      where: { organisationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return orgUsers.map((ou) => ({
      ...ou.user,
      role: ou.role,
      isApprover: ou.isApprover,
      organisationUserId: ou.id,
      isActive: ou.isActive && ou.user.isActive,
    }));
  }

  static async addToOrganisation(data: AddUserToOrganisationInput, actorId: string) {
    const orgUser = await prisma.organisationUser.upsert({
      where: {
        organisationId_userId: {
          organisationId: data.organisationId,
          userId: data.userId,
        },
      },
      update: {
        role: data.role,
        isApprover: data.isApprover,
        isActive: true,
      },
      create: {
        userId: data.userId,
        organisationId: data.organisationId,
        role: data.role,
        isApprover: data.isApprover,
        isActive: true,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        organisation: { select: { id: true, code: true, name: true } },
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "ADD_USER_TO_ORG",
      entityType: "OrganisationUser",
      entityId: orgUser.id,
      newValues: orgUser,
    });

    return orgUser;
  }

  static async removeFromOrganisation(organisationId: string, userId: string, actorId: string) {
    const orgUser = await prisma.organisationUser.delete({
      where: {
        organisationId_userId: { organisationId, userId },
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "REMOVE_USER_FROM_ORG",
      entityType: "OrganisationUser",
      entityId: orgUser.id,
      oldValues: orgUser,
    });

    return orgUser;
  }

  static async getUserOrganisations(userId: string) {
    return prisma.organisationUser.findMany({
      where: { userId, isActive: true },
      include: {
        organisation: {
          select: { id: true, code: true, name: true, type: true, baseCurrency: true },
        },
      },
    });
  }

  static async getUserRole(userId: string, organisationId: string) {
    const orgUser = await prisma.organisationUser.findUnique({
      where: {
        organisationId_userId: { organisationId, userId },
      },
    });

    return orgUser?.role ?? null;
  }
}
