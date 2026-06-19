import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PlatformReviewBody } from "@types";

/**
 * POST /admin/biz/products/:id/platform-review
 * 平台终审（approve/reject）
 * 权限：reviewer / admin
 */
export const POST = async (req: MedusaRequest<PlatformReviewBody>, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("productExtensionService") as any;
    const { action, reject_reason, scores } = req.body;
    const actor = {
      type: "user" as const,
      id: req.actor?.id || "",
      platformRole: req.actor?.platformRole,
      orgRole: undefined,
    };

    const result = await service.platformReview(
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
