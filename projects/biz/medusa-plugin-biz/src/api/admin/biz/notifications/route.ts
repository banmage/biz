import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /admin/biz/notifications
 * 后台通知查询（只读，分页）
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("notificationService");
    // 管理员查看所有 user 类型的通知
    const result = await service.listNotifications("user", req.actor?.id || "", req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
