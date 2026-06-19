import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /store/biz/products/:id/submit
 * 提交审核 draft → org_pending
 * 权限：maintainer
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("productExtensionService") as any;
    const actor = {
      type: "customer" as const,
      id: req.actor?.id || "",
      orgId: req.actor?.orgId,
      orgRole: req.actor?.orgRole,
      platformRole: undefined,
    };

    const result = await service.submitForReview(req.params.id, actor, req.scope);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
