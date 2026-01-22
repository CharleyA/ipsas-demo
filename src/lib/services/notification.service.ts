import prisma from "@/lib/db";
import { NotificationType } from "@prisma/client";

export class NotificationService {
  static async create({
    organisationId,
    userId,
    type,
    title,
    message,
    metadata,
  }: {
    organisationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    return prisma.notification.create({
      data: {
        organisationId,
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
      },
    });
  }

  static async notifyRoleInOrganisation({
    organisationId,
    role,
    type,
    title,
    message,
    metadata,
  }: {
    organisationId: string;
    role: "HEADMASTER" | "BURSAR" | "ADMIN" | "ACCOUNTANT";
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const users = await prisma.organisationUser.findMany({
      where: {
        organisationId,
        role,
        isActive: true,
      },
      include: { user: true },
    });

    const notifications = await Promise.all(
      users.map((orgUser) =>
        this.create({
          organisationId,
          userId: orgUser.userId,
          type,
          title,
          message,
          metadata,
        })
      )
    );

    // Future: Trigger email sending here
    // for (const orgUser of users) {
    //   if (orgUser.user.email) {
    //     await EmailService.send(...)
    //   }
    // }

    return notifications;
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  static async listForUser(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
