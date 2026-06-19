import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /admin/biz/reviews
 * 评论列表（分页，可按 status 过滤）
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("reviewService") as any;
    const result = await service.listAllReviews(req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};

/**
 * POST /admin/biz/reviews/:id/moderate
 * 评论审核（approve/hide/unhide/delete）
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("reviewService") as any;
    const { action } = req.body;
    const reviewerId = req.actor?.id;

    if (!reviewerId) {
      return res.status(401).json({ success: false, error: { code: "BIZ_UNAUTHORIZED", message: "未登录" } });
    }

    const result = await service.moderateReview(req.params.id, action, reviewerId);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
