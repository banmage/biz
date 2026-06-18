import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /admin/biz/products
 * 待审核产品列表（分页，可按 status 过滤）
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("productExtensionService");
    const result = await service.listProducts(req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
