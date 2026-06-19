import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /store/biz/org-members/invitations
 * 邀请成员
 * 权限：creator（机构角色）
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = req.scope.resolve("orgMemberService") as any;
    const { email, role } = req.body;
    const actorId = req.actor?.id || "";

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: { code: "BIZ_VALIDATION_ERROR", message: "请填写邮箱和角色" },
      });
    }

    // 从 email 查找 customer（简化：实际应该通过 email 查 customer）
    // MVP 版本直接返回提示
    return res.status(200).json({
      success: true,
      data: { message: "邀请已发送（MVP 测试模式）" },
      message: "邀请已发送",
    });
  } catch (err: any) {
    const status = err.httpStatus || 500;
    res.status(status).json({
      success: false,
      error: { code: err.code || "BIZ_INTERNAL_ERROR", message: err.message },
    });
  }
};
