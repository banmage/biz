import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { OrgReviewBody } from "@types";

/**
 * POST /admin/biz/products/:id/org-review
 * 机构内审（approve/reject）
 * 权限：approver（机构角色）
 */
export const POST = async (req: MedusaRequest<OrgReviewBody>, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("productExtensionService") as any;
    const { action, reject_reason, scores } = req.body;
    const actor = {
      type: "customer" as const,
      id: req.actor?.id || "",
      orgId: req.actor?.orgId,
      orgRole: req.actor?.orgRole,
      platformRole: undefined,
    };

    const result = await service.orgReview(
      req.params.id,
      action,
      actor,
      scores,
      reject_reason,
      req.scope
    );
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
