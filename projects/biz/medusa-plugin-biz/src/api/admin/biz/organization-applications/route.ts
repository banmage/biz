import { Request, Response } from "express";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /admin/biz/organization-applications
 * 入驻申请列表（分页，可按 status 过滤）
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("organizationService");
    const result = await service.listApplications(req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};

/**
 * POST /admin/biz/organization-applications/:id/review
 * 审核入驻申请（approve/reject）
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("organizationService") as any;
    const { action, reject_reason } = req.body;
    const reviewerId = req.actor?.id;

    if (!reviewerId) {
      return res.status(401).json({ success: false, error: { code: "BIZ_UNAUTHORIZED", message: "未登录" } });
    }

    const result = await service.reviewApplication(
      req.params.id,
      action,
      reviewerId,
      reject_reason,
      req.scope
    );
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
