import {
  MedusaService,
  InjectTransactionManager,
  MedusaContext,
} from "@medusajs/framework/utils";
import { Context } from "@medusajs/framework/types";
import { BizProductExtension } from "./models/product-extension";
import { BizProductReviewLog } from "./models/product-review-log";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { assertTransition, TransitionMap } from "../../lib/state-machine";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";
import { Actor } from "../../types";

/** afterCommit 回调：写审计日志 + 发通知（事务外执行） */
async function afterCommitAuditAndNotify(params: {
  container: any;
  actorType: "user" | "customer";
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: "success" | "failure";
  details?: any;
  notification?: {
    recipientType: "user" | "customer";
    recipientId: string;
    type: string;
    title: string;
    content: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  };
}) {
  const { container, notification } = params;
  const logger = container.resolve("logger");

  // 1. 写审计日志（独立事务，失败仅 log）
  try {
    const auditLogService = container.resolve("auditLogService");
    if (auditLogService) {
      await auditLogService.writeAuditLog({
        actorType: params.actorType,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        result: params.result,
        details: params.details || null,
      });
    }
  } catch (e) {
    logger.error("Audit log write failed in afterCommit", e);
  }

  // 2. 发通知（独立事务，失败仅 log）
  if (notification) {
    try {
      const notificationService = container.resolve("notificationService");
      if (notificationService) {
        await notificationService.createNotification({
          recipientType: notification.recipientType,
          recipientId: notification.recipientId,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId,
        });
      }
    } catch (e) {
      logger.error("Notification create failed in afterCommit", e);
    }
  }
}

// 产品审核状态机
const REVIEW_TRANSITIONS: TransitionMap = {
  draft: { submit_org_review: "org_pending" },
  org_pending: { org_approve: "platform_pending", org_reject: "draft" },
  platform_pending: { platform_approve: "published", platform_reject: "draft" },
  // published 为终态
};

class ProductExtensionService extends MedusaService({
  ProductExtension: BizProductExtension,
  ProductReviewLog: BizProductReviewLog,
}) {
  private getContainer(container?: any): any {
    return container || (this as any).container;
  }

  /**
   * 创建产品（唯一入口）
   * 同一事务中：调用核心 createProductsWorkflow + 创建 ProductExtension
   * afterCommit：写审计日志 + 发通知
   */
  async createProductWithExtension(
    payload: {
      title: string;
      subtitle?: string;
      description?: string;
      handle?: string;
      status?: string;
      tags?: string[];
    },
    actor: Actor,
    container?: any
  ) {
    if (!actor.orgId) {
      throw new BizError(
        BizErrorCode.BIZ_FORBIDDEN,
        "未关联机构，无法创建产品"
      );
    }

    // 标签校验
    const tags = this.validateTags(payload.tags);
    const resolvedContainer = this.getContainer(container);

    // 调用核心 createProductsWorkflow
    const createProductsWorkflow = resolvedContainer.resolve("createProductsWorkflow");
    if (!createProductsWorkflow) {
      throw new BizError(
        BizErrorCode.BIZ_INTERNAL_ERROR,
        "createProductsWorkflow 未注册"
      );
    }

    const { result: products } = await createProductsWorkflow.run({
      input: {
        products: [
          {
            title: payload.title,
            subtitle: payload.subtitle || null,
            description: payload.description || null,
            handle: payload.handle || null,
            status: payload.status || "draft",
          },
        ],
        additional_data: {
          organization_id: actor.orgId,
        },
      },
      container: resolvedContainer,
    });

    const product = products[0];

    // 创建 ProductExtension
    const result = await this.createProductExtension_(product.id, actor.orgId, tags);

    // afterCommit：审计日志 + 通知（事务外异步执行，失败不阻塞）
    setImmediate(() => {
      afterCommitAuditAndNotify({
        container: resolvedContainer,
        actorType: actor.type,
        actorId: actor.id,
        action: "product_extension.create",
        targetType: "product_extension",
        targetId: result.data.extensionId,
        result: "success",
        details: {
          productId: product.id,
          organizationId: actor.orgId,
          title: payload.title,
        },
        notification: actor.type === "customer" ? {
          recipientType: actor.type,
          recipientId: actor.id,
          type: "product_created",
          title: "产品已创建",
          content: `产品「${payload.title}」已创建成功，当前状态：草稿`,
          relatedEntityType: "product",
          relatedEntityId: product.id,
        } : undefined,
      });
    });

    return successResponse(
      {
        productId: product.id,
        extensionId: result.data.extensionId,
        reviewStatus: result.data.reviewStatus,
      },
      "产品创建成功"
    );
  }

  @InjectTransactionManager()
  protected async createProductExtension_(
    productId: string,
    organizationId: string,
    tags: string[],
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const extensionRepo = manager.getRepository(BizProductExtension);

    const [extension] = await extensionRepo.create([{
      product_id: productId,
      organization_id: organizationId,
      review_status: "draft",
      metadata: tags.length > 0 ? { tags } : null,
    }]);

    return successResponse(
      {
        productId: productId,
        extensionId: extension.id,
        reviewStatus: extension.review_status,
      },
      "产品创建成功"
    );
  }

  /**
   * 提交审核 draft → org_pending
   * SELECT FOR UPDATE 锁定 ProductExtension 行后生成 round
   */
  async submitForReview(productId: string, actor: Actor, container?: any) {
    return await this.submitForReview_(productId, actor, this.getContainer(container));
  }

  @InjectTransactionManager()
  protected async submitForReview_(
    productId: string,
    actor: Actor,
    resolvedContainer: any,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const [extension] = await extensionRepo.find({ where: { product_id: productId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    // 状态机断言
    assertTransition(REVIEW_TRANSITIONS, extension.review_status, "submit_org_review");

    // SELECT FOR UPDATE 锁定行，防止并发 round 冲突
    await manager.execute("SELECT 1 FROM biz_product_extension WHERE id = ? FOR UPDATE", [extension.id]);

    // 生成 round（COUNT + 1，在锁保护下）
    const count = await reviewLogRepo.count({
      where: { product_extension_id: extension.id },
    });
    const round = count + 1;

    await extensionRepo.update([{
      entity: extension,
      update: { review_status: "org_pending" },
    }]);

    // 写审核日志
    await reviewLogRepo.create([{
      product_extension_id: extension.id,
      round,
      reviewer_scope: "org",
      reviewer_id: actor.id,
      action: "submit",
    }]);

    const responseData = {
      productId,
      reviewStatus: "org_pending",
      round,
    };

    // afterCommit：审计日志 + 通知
    setImmediate(() => {
      afterCommitAuditAndNotify({
        container: resolvedContainer,
        actorType: actor.type,
        actorId: actor.id,
        action: "product_extension.submit_org_review",
        targetType: "product_extension",
        targetId: extension.id,
        result: "success",
        details: { productId, round },
        notification: {
          recipientType: "customer",
          recipientId: actor.id,
          type: "product_submitted",
          title: "产品已提交审核",
          content: `产品已提交机构内审，当前轮次：第${round}轮`,
          relatedEntityType: "product_extension",
          relatedEntityId: extension.id,
        },
      });
    });

    return successResponse(responseData, "提交审核成功");
  }

  /**
   * 机构内审 org_pending → platform_pending / draft
   * 通过时必须填写 3 个机构评分
   * SELECT FOR UPDATE 锁定行后生成 round
   */
  async orgReview(
    extensionId: string,
    action: "approve" | "reject",
    actor: Actor,
    scores?: {
      innovation: number;
      complexity: number;
      novelty: number;
    },
    rejectReason?: string,
    container?: any
  ) {
    return await this.orgReview_(extensionId, action, actor, scores, rejectReason, this.getContainer(container));
  }

  @InjectTransactionManager()
  protected async orgReview_(
    extensionId: string,
    action: "approve" | "reject",
    actor: Actor,
    scores?: {
      innovation: number;
      complexity: number;
      novelty: number;
    },
    rejectReason?: string,
    resolvedContainer?: any,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const [extension] = await extensionRepo.find({ where: { id: extensionId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    const eventName = action === "approve" ? "org_approve" : "org_reject";
    const newStatus = assertTransition(REVIEW_TRANSITIONS, extension.review_status, eventName);

    const updateData: any = { review_status: newStatus };

    if (action === "approve") {
      // 校验评分完整性
      if (!scores || !scores.innovation || !scores.complexity || !scores.novelty) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "机构内审通过时必须填写全部3个评分"
        );
      }
      this.validateScores(scores);
      updateData.organization_innovation_score = scores.innovation;
      updateData.organization_complexity_score = scores.complexity;
      updateData.organization_novelty_score = scores.novelty;
    } else {
      // reject 必须填写原因
      if (!rejectReason || rejectReason.trim().length === 0) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "驳回时必须填写驳回原因"
        );
      }
    }

    await extensionRepo.update([{ entity: extension, update: updateData }]);

    // SELECT FOR UPDATE 锁定行后生成 round
    await manager.execute("SELECT 1 FROM biz_product_extension WHERE id = ? FOR UPDATE", [extension.id]);

    // 写审核日志
    const count = await reviewLogRepo.count({
      where: { product_extension_id: extension.id },
    });
    const round = count + 1;

    await reviewLogRepo.create([{
      product_extension_id: extension.id,
      round,
      reviewer_scope: "org",
      reviewer_id: actor.id,
      action,
      reject_reason: rejectReason || null,
    }]);

    const responseData = {
      extensionId: extension.id,
      reviewStatus: extension.review_status,
      round,
    };

    // afterCommit：审计日志 + 通知
    const actionText = action === "approve" ? "内审通过" : "内审驳回";
    setImmediate(() => {
      afterCommitAuditAndNotify({
        container: resolvedContainer,
        actorType: actor.type,
        actorId: actor.id,
        action: `product_extension.${eventName}`,
        targetType: "product_extension",
        targetId: extension.id,
        result: "success",
        details: {
          productId: extension.product_id,
          organizationId: extension.organization_id,
          action,
          scores: action === "approve" ? scores : undefined,
          rejectReason: action === "reject" ? rejectReason : undefined,
          round,
        },
        notification: {
          recipientType: "customer",
          recipientId: actor.id,
          type: action === "approve" ? "product_org_approved" : "product_org_rejected",
          title: `产品${actionText}`,
          content: action === "approve"
            ? `产品已通过机构内审，进入平台审核阶段`
            : `产品被机构内审驳回，原因：${rejectReason}`,
          relatedEntityType: "product_extension",
          relatedEntityId: extension.id,
        },
      });
    });

    return successResponse(responseData, action === "approve" ? "内审通过" : "内审驳回");
  }

  /**
   * 平台终审 platform_pending → published / draft
   * 通过时必须填写 3 个平台评分，并调用 updateProductsWorkflow
   * SELECT FOR UPDATE 锁定行后生成 round
   */
  async platformReview(
    extensionId: string,
    action: "approve" | "reject",
    actor: Actor,
    scores?: {
      innovation: number;
      complexity: number;
      novelty: number;
    },
    rejectReason?: string,
    container?: any
  ) {
    return await this.platformReview_(extensionId, action, actor, scores, rejectReason, this.getContainer(container));
  }

  @InjectTransactionManager()
  protected async platformReview_(
    extensionId: string,
    action: "approve" | "reject",
    actor: Actor,
    scores?: {
      innovation: number;
      complexity: number;
      novelty: number;
    },
    rejectReason?: string,
    resolvedContainer?: any,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const [extension] = await extensionRepo.find({ where: { id: extensionId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    const eventName = action === "approve" ? "platform_approve" : "platform_reject";
    const newStatus = assertTransition(REVIEW_TRANSITIONS, extension.review_status, eventName);

    const updateData: any = { review_status: newStatus };

    if (action === "approve") {
      if (!scores || !scores.innovation || !scores.complexity || !scores.novelty) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "平台终审通过时必须填写全部3个评分"
        );
      }
      this.validateScores(scores);
      updateData.platform_innovation_score = scores.innovation;
      updateData.platform_complexity_score = scores.complexity;
      updateData.platform_novelty_score = scores.novelty;
    } else {
      if (!rejectReason || rejectReason.trim().length === 0) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "驳回时必须填写驳回原因"
        );
      }
    }

    await extensionRepo.update([{ entity: extension, update: updateData }]);

    // 如果通过，调用核心 updateProductsWorkflow 发布产品
    if (action === "approve") {
      const updateProductsWorkflow = resolvedContainer.resolve("updateProductsWorkflow");
      if (updateProductsWorkflow) {
        await updateProductsWorkflow.run({
          input: {
            selector: { id: [extension.product_id] },
            update: { status: "published" },
          },
          container: resolvedContainer,
        });
      }
    }

    // SELECT FOR UPDATE 锁定行后生成 round
    await manager.execute("SELECT 1 FROM biz_product_extension WHERE id = ? FOR UPDATE", [extension.id]);

    // 写审核日志
    const count = await reviewLogRepo.count({
      where: { product_extension_id: extension.id },
    });
    const round = count + 1;

    await reviewLogRepo.create([{
      product_extension_id: extension.id,
      round,
      reviewer_scope: "platform",
      reviewer_id: actor.id,
      action,
      reject_reason: rejectReason || null,
    }]);

    const responseData = {
      extensionId: extension.id,
      reviewStatus: extension.review_status,
      round,
    };

    // afterCommit：审计日志 + 通知
    const actionText = action === "approve" ? "终审通过，产品已发布" : "终审驳回";
    setImmediate(() => {
      afterCommitAuditAndNotify({
        container: resolvedContainer,
        actorType: actor.type,
        actorId: actor.id,
        action: `product_extension.${eventName}`,
        targetType: "product_extension",
        targetId: extension.id,
        result: "success",
        details: {
          productId: extension.product_id,
          organizationId: extension.organization_id,
          action,
          scores: action === "approve" ? scores : undefined,
          rejectReason: action === "reject" ? rejectReason : undefined,
          round,
        },
        notification: {
          recipientType: "customer",
          recipientId: extension.organization_id, // 通知机构
          type: action === "approve" ? "product_published" : "product_platform_rejected",
          title: `产品${actionText}`,
          content: action === "approve"
            ? `产品已通过平台终审并发布`
            : `产品被平台终审驳回，原因：${rejectReason}`,
          relatedEntityType: "product_extension",
          relatedEntityId: extension.id,
        },
      });
    });

    return successResponse(responseData, actionText);
  }

  /**
   * 获取产品扩展信息
   */
  async getExtension(productId: string) {
    return await this.getExtension_(productId);
  }

  @InjectTransactionManager()
  protected async getExtension_(
    productId: string,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const repo = manager.getRepository(BizProductExtension);

    const [extension] = await repo.find({ where: { product_id: productId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    return successResponse(extension, "查询成功");
  }

  /**
   * 获取产品列表（分页）
   */
  async listProducts(query: Record<string, any>) {
    return await this.listProducts_(query);
  }

  @InjectTransactionManager()
  protected async listProducts_(
    query: Record<string, any>,
    @MedusaContext() sharedContext?: Context
  ) {
    const manager = sharedContext!.transactionManager as any;
    const repo = manager.getRepository(BizProductExtension);
    const { limit, offset } = parsePagination(query);
    const status = query.status as string | undefined;

    const where = status ? { review_status: status } : {};
    const [rows, total] = await repo.findAndCount({ where }, { limit, offset, orderBy: { created_at: "DESC" } });

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  // ─── 私有工具 ──────────────────────────────────────────

  private validateTags(tags?: string[]): string[] {
    if (!tags || tags.length === 0) return [];
    if (tags.length > 10) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "标签数量不能超过10个"
      );
    }
    return tags.map((t) => {
      if (t.length > 20) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "单个标签长度不能超过20字符"
        );
      }
      return t.toLowerCase();
    });
  }

  private validateScores(scores: { innovation: number; complexity: number; novelty: number }) {
    for (const [key, val] of Object.entries(scores)) {
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          `${key} 评分必须是1-5的整数`
        );
      }
    }
  }
}

export default ProductExtensionService;
