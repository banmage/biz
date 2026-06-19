import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /store/biz/products
 * 创建产品（唯一入口）
 * 权限：maintainer / creator
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

    const result = await service.createProductWithExtension(req.body, actor, req.scope);
    res.status(201).json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
