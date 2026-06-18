import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizNotification } from "./models/notification";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";

class NotificationService extends MedusaService({
  Notification: BizNotification,
}) {
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 创建通知
   */
  async createNotification(data: {
    recipientType: "user" | "customer";
    recipientId: string;
    type: string;
    title: string;
    content: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizNotification);

    if (data.title.length > 200) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "标题长度不能超过200字符"
      );
    }

    const notification = repo.create({
      recipient_type: data.recipientType,
      recipient_id: data.recipientId,
      type: data.type,
      title: data.title,
      content: data.content,
      is_read: false,
      related_entity_type: data.relatedEntityType || null,
      related_entity_id: data.relatedEntityId || null,
    });

    await repo.persistAndFlush(notification);

    return successResponse(
      { notificationId: notification.id },
      "通知创建成功"
    );
  }

  /**
   * 通知列表（分页）
   */
  async listNotifications(recipientType: string, recipientId: string, query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizNotification);
    const { limit, offset } = parsePagination(query);

    const [rows, total] = await repo.findAndCount(
      { recipient_type: recipientType, recipient_id: recipientId },
      {
        limit,
        offset,
        orderBy: { created_at: "DESC" },
      }
    );

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  /**
   * 标记已读
   */
  async markAsRead(notificationId: string, recipientId: string) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizNotification);

    const notification = await repo.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "通知不存在");
    }

    if (notification.recipient_id !== recipientId) {
      throw new BizError(BizErrorCode.BIZ_FORBIDDEN, "无权操作此通知");
    }

    notification.is_read = true;
    await repo.persistAndFlush(notification);

    return successResponse({ notificationId: notification.id }, "已标记为已读");
  }
}

export default NotificationService;
