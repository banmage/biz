import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /store/biz/org-members/invitations/:id/respond
 * 处理邀请（accept/decline）
 * 权限：受邀人本人
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("orgMemberService");
    const customerId = req.actor?.id || "";
    const { action } = req.body;

    const result = await service.respondInvitation(
      req.params.id,
      customerId,
      action
    );
    res.json(result);
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({ success: false, error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message } });
  }
};
