import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /store/biz/products/:id/reviews
 * 发表评论
 * 权限：登录 Customer
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("reviewService");
    const customerId = req.actor?.id || "";
    const { content, scores } = req.body;

    const result = await service.createReview(
      req.params.id,
      customerId,
      content,
      scores
    );
    res.status(201).json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};

/**
 * GET /store/biz/products/:id/reviews
 * 查看已发布评论
 * 权限：公开
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("reviewService");
    const result = await service.listPublishedReviews(req.params.id, req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
