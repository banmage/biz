/**
 * 中间件统一注册文件（Medusa v2 规范）
 * 
 * 通过 MiddlewaresConfig 集中配置所有中间件
 * 注意：实际中间件将在阶段 8 逐步完善，此处先建立骨架
 */

// 限流配置常量
export const RATE_LIMIT_CONFIG = {
  // 读操作（GET）：100 次/分钟/IP 或用户
  read: {
    windowMs: 60 * 1000, // 1 分钟
    max: 100,
  },
  // 写操作（POST/PUT/DELETE）：20 次/分钟/用户
  write: {
    windowMs: 60 * 1000,
    max: 20,
  },
  // 敏感操作（审核、角色变更、状态变更）：10 次/分钟/管理员
  sensitive: {
    windowMs: 60 * 1000,
    max: 10,
  },
};

// 中间件配置占位 — 将在阶段 8 填充实际路由
export const config = {
  routes: [
    // 将在后续阶段填充
  ],
};
