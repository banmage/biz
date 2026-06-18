import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /store/biz/notifications
 * 通知列表（分页）
 * 权限：机构成员
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("notificationService");
    const customerId = req.actor?.id || "";
    const result = await service.listNotifications("customer", customerId, req.query);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};

/**
 * POST /store/biz/notifications/:id/read
 * 标记已读
 * 权限：本人
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("notificationService");
    const customerId = req.actor?.id || "";
    const result = await service.markAsRead(req.params.id, customerId);
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
