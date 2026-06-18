/**
 * Medusa Biz 定制平台 — 插件入口
 * 
 * Phase 1 MVP：机构 + 双层审核 + 产品扩展系统
 * 
 * 模块注册顺序（按依赖关系）：
 * 1. bizOrganization      — 机构域（最优先）
 * 2. bizOrgMember         — 机构成员域
 * 3. bizProductExtension  — 产品扩展域（核心）
 * 4. bizReview            — 评论打分域
 * 5. bizNotification      — 通知域
 * 6. bizAuditLog          — 审计日志域
 */

import bizOrganization from "./modules/bizOrganization";
import bizOrgMember from "./modules/bizOrgMember";
import bizProductExtension from "./modules/bizProductExtension";
import bizReview from "./modules/bizReview";
import bizNotification from "./modules/bizNotification";
import bizAuditLog from "./modules/bizAuditLog";

export const config: any = {
  name: "@your-org/medusa-plugin-biz",
  version: "0.1.0",
  modules: [
    bizOrganization,
    bizOrgMember,
    bizProductExtension,
    bizReview,
    bizNotification,
    bizAuditLog,
  ],
};
