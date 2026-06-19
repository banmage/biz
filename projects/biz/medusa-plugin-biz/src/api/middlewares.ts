import { MiddlewaresConfig } from "@medusajs/framework/http";
import { authenticate } from "@medusajs/medusa";
import { Actor } from "../types";

/**
 * 平台角色解析中间件
 * 从 User.metadata.biz_role 读取平台角色，挂载 req.actor
 *
 * 前置条件：authenticate("user") 已执行，req.user 存在
 */
const resolvePlatform = async (req: any, res: any, next: any) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "BIZ_UNAUTHORIZED", message: "未登录" },
      });
    }

    // 从 User.metadata.biz_role 读取平台角色
    const platformRole = user.metadata?.biz_role || null;

    req.actor = {
      type: "user" as const,
      id: user.id,
      platformRole,
    } as Actor;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 机构角色解析中间件
 * 从 Customer 关联查询 OrgMember，挂载 req.actor
 *
 * 前置条件：authenticate("customer") 已执行，req.customer 存在
 */
const resolveOrg = async (req: any, res: any, next: any) => {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({
        success: false,
        error: { code: "BIZ_UNAUTHORIZED", message: "未登录" },
      });
    }

    // 通过容器解析 OrgMemberService 查询机构成员信息
    let orgRole: string | undefined;
    let orgId: string | undefined;

    try {
      const orgMemberService = req.scope.resolve("orgMemberService");
      if (orgMemberService) {
        const memberResult = await orgMemberService.getMemberByCustomerId(customer.id);
        if (memberResult?.success && memberResult.data) {
          orgRole = memberResult.data.role;
          orgId = memberResult.data.organization_id;
        }
      }
    } catch (e) {
      // 查询失败不阻塞请求（可能是尚未加入机构的用户）
      // 路由 handler 中会自行校验权限
    }

    req.actor = {
      type: "customer" as const,
      id: customer.id,
      orgId,
      orgRole: orgRole as any,
    } as Actor;

    next();
  } catch (err) {
    next(err);
  }
};

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/biz/*",
      middlewares: [authenticate("customer", "bearer"), resolveOrg],
    },
    {
      matcher: "/admin/biz/*",
      middlewares: [authenticate("user", "bearer"), resolvePlatform],
    },
  ],
};
