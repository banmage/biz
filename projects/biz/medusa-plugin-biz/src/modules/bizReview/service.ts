import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizProductReview } from "./models/product-review";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { assertTransition, TransitionMap } from "../../lib/state-machine";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";

// 评论状态机
const REVIEW_TRANSITIONS: TransitionMap = {
  pending: { approve: "published", hide: "hidden" },
  published: { hide: "hidden" },
  hidden: { unhide: "published" },
  // deleted 为终态
};

class ReviewService extends MedusaService({
  ProductReview: BizProductReview,
}) {
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 发表评论
   * content.length >= 10，四维评分 1-5
   */
  async createReview(
    productId: string,
    customerId: string,
    content: string,
    scores: {
      overall: number;
      innovation: number;
      complexity: number;
      novelty: number;
    }
  ) {
    // 内容长度校验
    if (!content || content.trim().length < 10) {
      throw new BizError(
        BizErrorCode.BIZ_REVIEW_TEXT_TOO_SHORT,
        "评论内容不能少于10个字符"
      );
    }
    if (content.length > 5000) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "评论内容不能超过5000个字符"
      );
    }

    // 评分校验
    for (const [key, val] of Object.entries(scores)) {
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          `${key} 评分必须是1-5的整数`
        );
      }
    }

    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductReview);

    const review = repo.create({
      product_id: productId,
      customer_id: customerId,
      content: content.trim(),
      overall_score: scores.overall,
      innovation_score: scores.innovation,
      complexity_score: scores.complexity,
      novelty_score: scores.novelty,
      status: "pending",
    });

    await repo.persistAndFlush(review);

    return successResponse(
      { reviewId: review.id, status: review.status },
      "评论提交成功，等待审核"
    );
  }

  /**
   * 审核评论
   * approve: pending → published
   * hide: pending/published → hidden
   * unhide: hidden → published
   * delete: pending/published/hidden → deleted
   */
  async moderateReview(
    reviewId: string,
    action: "approve" | "hide" | "unhide" | "delete",
    reviewerUserId: string
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductReview);

    const review = await repo.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "评论不存在");
    }

    if (action === "delete") {
      // delete 不需要状态机断言，直接设置终态
      review.status = "deleted";
      review.reviewed_by = reviewerUserId;
      review.reviewed_at = new Date();
      await repo.persistAndFlush(review);

      return successResponse(
        { reviewId: review.id, status: "deleted" },
        "评论已删除"
      );
    }

    const newStatus = assertTransition(REVIEW_TRANSITIONS, review.status, action);
    review.status = newStatus;
    review.reviewed_by = reviewerUserId;
    review.reviewed_at = new Date();
    await repo.persistAndFlush(review);

    const actionMap: Record<string, string> = {
      approve: "评论已通过",
      hide: "评论已隐藏",
      unhide: "评论已恢复显示",
    };

    return successResponse(
      { reviewId: review.id, status: review.status },
      actionMap[action] || "操作成功"
    );
  }

  /**
   * 获取已发布评论列表
   */
  async listPublishedReviews(productId: string, query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductReview);
    const { limit, offset } = parsePagination(query);

    const [rows, total] = await repo.findAndCount(
      { product_id: productId, status: "published" },
      {
        limit,
        offset,
        orderBy: { created_at: "DESC" },
      }
    );

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  /**
   * 获取评论列表（管理端，分页）
   */
  async listAllReviews(query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizProductReview);
    const { limit, offset } = parsePagination(query);
    const status = query.status as string | undefined;

    const where = status ? { status } : {};
    const [rows, total] = await repo.findAndCount(where, {
      limit,
      offset,
      orderBy: { created_at: "DESC" },
    });

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }
}

export default ReviewService;
