import { MiddlewaresConfig } from "@medusajs/framework/http";
import { authenticate } from "@medusajs/medusa";
import { Actor } from "../types";

/**
 * 平台角色解析中间件
 * 从 User.metadata.biz_role 读取平台角色，挂载 req.actor
 */
const resolvePlatform = async (req: any, res: any, next: any) => {
  try {
    const actor = req.actor as Actor | undefined;
    if (actor) {
      // actor 已由 authenticate 中间件挂载了 user 信息
      // 此处仅做类型断言，实际角色在路由 handler 中从 User.metadata 读取
      next();
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 机构角色解析中间件
 * 从 Customer 关联查询 OrgMember，挂载 req.actor
 */
const resolveOrg = async (req: any, res: any, next: any) => {
  try {
    const actor = req.actor as Actor | undefined;
    if (actor) {
      // actor 已由 authenticate 中间件挂载了 customer 信息
      // 实际机构角色在路由 handler 中从 OrgMember 表查询
      next();
      return;
    }
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
