import { Request, Response } from "express";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /admin/biz/organizations
 * 机构列表（分页，可按 status 过滤）
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("organizationService") as any;
    const result = await service.listOrganizations(req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};

/**
 * POST /admin/biz/organizations/:id/status
 * 变更机构状态（suspend/ban/activate）
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("organizationService") as any;
    const { event } = req.body;
    const actorRole = req.actor?.platformRole;

    const result = await service.updateOrganizationStatus(
      req.params.id,
      event,
      actorRole
    );
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
