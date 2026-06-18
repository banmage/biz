import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizProductExtension } from "./models/product-extension";
import { BizProductReviewLog } from "./models/product-review-log";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { assertTransition, TransitionMap } from "../../lib/state-machine";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";
import { Actor } from "../../types";

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
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 创建产品（唯一入口）
   * 同一事务中：创建核心 Product + ProductExtension
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
    actor: Actor
  ) {
    if (!actor.orgId) {
      throw new BizError(
        BizErrorCode.BIZ_FORBIDDEN,
        "未关联机构，无法创建产品"
      );
    }

    const manager = this.container.resolve("manager") as EntityManager;
    const extensionRepo = manager.getRepository(BizProductExtension);

    // 标签校验
    const tags = this.validateTags(payload.tags);

    // 调用核心 createProductsWorkflow
    const createProductsWorkflow = this.container.resolve("createProductsWorkflow");
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
      container: this.container,
    });

    const product = products[0];

    // 创建 ProductExtension
    const extension = extensionRepo.create({
      product_id: product.id,
      organization_id: actor.orgId,
      review_status: "draft",
      metadata: tags.length > 0 ? { tags } : null,
    });

    await extensionRepo.persistAndFlush(extension);

    return successResponse(
      {
        productId: product.id,
        extensionId: extension.id,
        reviewStatus: extension.review_status,
      },
      "产品创建成功"
    );
  }

  /**
   * 提交审核 draft → org_pending
   * 前置条件：校验产品基本信息完整（标题、描述等），非评分
   */
  async submitForReview(productId: string, actor: Actor) {
    const manager = this.container.resolve("manager") as EntityManager;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const extension = await extensionRepo.findOne({
      where: { product_id: productId },
    });

    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    // 状态机断言
    assertTransition(REVIEW_TRANSITIONS, extension.review_status, "submit_org_review");

    // SELECT FOR UPDATE 锁定行
    const locked = await extensionRepo.findOne(
      { where: { id: extension.id } },
      { lock: { mode: "pessimistic_write" } }
    );

    if (!locked) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    // 生成 round（COUNT + 1，唯一约束防重）
    const round = await reviewLogRepo.count({
      product_extension_id: locked.id,
    }) + 1;

    locked.review_status = "org_pending";
    await extensionRepo.persistAndFlush(locked);

    // 写审核日志
    const log = reviewLogRepo.create({
      product_extension_id: locked.id,
      round,
      reviewer_scope: "org",
      reviewer_id: actor.id,
      action: "submit",
    });
    await reviewLogRepo.persistAndFlush(log);

    return successResponse(
      {
        productId,
        reviewStatus: "org_pending",
        round,
      },
      "提交审核成功"
    );
  }

  /**
   * 机构内审 org_pending → platform_pending / draft
   * 通过时必须填写 3 个机构评分
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
    rejectReason?: string
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const extension = await extensionRepo.findOne({ where: { id: extensionId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    const eventName = action === "approve" ? "org_approve" : "org_reject";
    const newStatus = assertTransition(REVIEW_TRANSITIONS, extension.review_status, eventName);

    if (action === "approve") {
      // 校验评分完整性
      if (!scores || !scores.innovation || !scores.complexity || !scores.novelty) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "机构内审通过时必须填写全部3个评分"
        );
      }
      this.validateScores(scores);

      extension.review_status = newStatus;
      extension.organization_innovation_score = scores.innovation;
      extension.organization_complexity_score = scores.complexity;
      extension.organization_novelty_score = scores.novelty;
    } else {
      // reject 必须填写原因
      if (!rejectReason || rejectReason.trim().length === 0) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "驳回时必须填写驳回原因"
        );
      }
      extension.review_status = newStatus;
    }

    await extensionRepo.persistAndFlush(extension);

    // 写审核日志
    const round = await reviewLogRepo.count({
      product_extension_id: extension.id,
    }) + 1;

    const log = reviewLogRepo.create({
      product_extension_id: extension.id,
      round,
      reviewer_scope: "org",
      reviewer_id: actor.id,
      action,
      reject_reason: rejectReason || null,
    });
    await reviewLogRepo.persistAndFlush(log);

    return successResponse(
      {
        extensionId: extension.id,
        reviewStatus: extension.review_status,
        round,
      },
      action === "approve" ? "内审通过" : "内审驳回"
    );
  }

  /**
   * 平台终审 platform_pending → published / draft
   * 通过时必须填写 3 个平台评分，并调用 updateProductsWorkflow
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
    rejectReason?: string
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const extensionRepo = manager.getRepository(BizProductExtension);
    const reviewLogRepo = manager.getRepository(BizProductReviewLog);

    const extension = await extensionRepo.findOne({ where: { id: extensionId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    const eventName = action === "approve" ? "platform_approve" : "platform_reject";
    const newStatus = assertTransition(REVIEW_TRANSITIONS, extension.review_status, eventName);

    if (action === "approve") {
      if (!scores || !scores.innovation || !scores.complexity || !scores.novelty) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "平台终审通过时必须填写全部3个评分"
        );
      }
      this.validateScores(scores);

      extension.review_status = newStatus;
      extension.platform_innovation_score = scores.innovation;
      extension.platform_complexity_score = scores.complexity;
      extension.platform_novelty_score = scores.novelty;

      // 调用核心 updateProductsWorkflow 发布产品
      const updateProductsWorkflow = this.container.resolve("updateProductsWorkflow");
      if (updateProductsWorkflow) {
        await updateProductsWorkflow.run({
          input: {
            selector: { id: [extension.product_id] },
            update: { status: "published" },
          },
          container: this.container,
        });
      }
    } else {
      if (!rejectReason || rejectReason.trim().length === 0) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "驳回时必须填写驳回原因"
        );
      }
      extension.review_status = newStatus;
    }

    await extensionRepo.persistAndFlush(extension);

    // 写审核日志
    const round = await reviewLogRepo.count({
      product_extension_id: extension.id,
    }) + 1;

    const log = reviewLogRepo.create({
      product_extension_id: extension.id,
      round,
      reviewer_scope: "platform",
      reviewer_id: actor.id,
      action,
      reject_reason: rejectReason || null,
    });
    await reviewLogRepo.persistAndFlush(log);

    return successResponse(
      {
        extensionId: extension.id,
        reviewStatus: extension.review_status,
        round,
      },
      action === "approve" ? "终审通过，产品已发布" : "终审驳回"
    );
  }

  /**
   * 获取产品扩展信息
   */
  async getExtension(productId: string) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductExtension);

    const extension = await repo.findOne({ where: { product_id: productId } });
    if (!extension) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "产品扩展不存在");
    }

    return successResponse(extension, "查询成功");
  }

  /**
   * 获取待审核产品列表（分页）
   */
  async listProducts(query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductExtension);
    const { limit, offset } = parsePagination(query);
    const status = query.status as string | undefined;

    const where = status ? { review_status: status } : {};
    const [rows, total] = await repo.findAndCount(where, {
      limit,
      offset,
      orderBy: { created_at: "DESC" },
    });

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
