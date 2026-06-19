import {
  MedusaService,
  InjectTransactionManager,
  MedusaContext,
} from "@medusajs/framework/utils";
import { Context } from "@medusajs/framework/types";
import { BizNotification } from "./models/notification";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";

class NotificationService extends MedusaService({
  Notification: BizNotification,
}) {
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
    return await this.createNotification_(data);
  }

  @InjectTransactionManager()
  protected async createNotification_(
    data: {
      recipientType: "user" | "customer";
      recipientId: string;
      type: string;
      title: string;
      content: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const repo = manager.getRepository(BizNotification);

    if (data.title.length > 200) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "标题长度不能超过200字符"
      );
    }

    const [notification] = await repo.create([{
      recipient_type: data.recipientType,
      recipient_id: data.recipientId,
      type: data.type,
      title: data.title,
      content: data.content,
      is_read: false,
      related_entity_type: data.relatedEntityType || null,
      related_entity_id: data.relatedEntityId || null,
    }]);

    return successResponse(
      { notificationId: notification.id },
      "通知创建成功"
    );
  }

  /**
   * 通知列表（分页）
   * 注意：MedusaService 自动生成了 listNotifications 方法，
   * 这里用 queryNotifications 作为自定义查询入口
   */
  async queryNotifications(recipientType: string, recipientId: string, query: Record<string, any>) {
    return await this.queryNotifications_(recipientType, recipientId, query);
  }

  @InjectTransactionManager()
  protected async queryNotifications_(
    recipientType: string,
    recipientId: string,
    query: Record<string, any>,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const repo = manager.getRepository(BizNotification);
    const { limit, offset } = parsePagination(query);

    const [rows, total] = await repo.findAndCount(
      { where: { recipient_type: recipientType, recipient_id: recipientId } },
      { limit, offset, orderBy: { created_at: "DESC" } }
    );

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  /**
   * 标记已读
   */
  async markAsRead(notificationId: string, recipientId: string) {
    return await this.markAsRead_(notificationId, recipientId);
  }

  @InjectTransactionManager()
  protected async markAsRead_(
    notificationId: string,
    recipientId: string,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const repo = manager.getRepository(BizNotification);

    const [notification] = await repo.find({ where: { id: notificationId } });
    if (!notification) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "通知不存在");
    }

    if (notification.recipient_id !== recipientId) {
      throw new BizError(BizErrorCode.BIZ_FORBIDDEN, "无权操作此通知");
    }

    await repo.update([{
      entity: notification,
      update: { is_read: true },
    }]);

    return successResponse({ notificationId: notification.id }, "已标记为已读");
  }
}

export default NotificationService;
