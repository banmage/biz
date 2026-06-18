import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /store/biz/products/:id/extension
 * 获取产品扩展信息
 * 权限：机构成员
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("productExtensionService");
    const result = await service.getExtension(req.params.id);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
