import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /store/biz/org-members/me
 * 获取当前用户机构及角色信息
 * 权限：登录 Customer
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("orgMemberService") as any;
    const customerId = req.actor?.id || "";
    const result = await service.getMemberByCustomerId(customerId);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
