/**
 * 限流工具 — 基于 Redis 的限流工厂函数
 * 
 * 使用方式：在中间件中调用 createRateLimiter 创建限流中间件
 * Redis Key 命名规范：biz:ratelimit:{scope}:{identifier}
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;    // 时间窗口（毫秒）
  maxRequests: number;  // 窗口内最大请求数
  keyPrefix: string;    // Redis key 前缀
}

/**
 * 创建基于 Redis 的限流中间件
 * 
 * @param config 限流配置
 * @param redisClient Redis 客户端（通过容器解析获取）
 * 
 * 注意：实际 Redis 客户端需要从 Medusa 容器中获取
 * 此处提供工厂函数骨架，具体实现在阶段 7 集成
 */
export const createRateLimiter = (config: RateLimitConfig, redisClient: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 阶段 7 实现完整限流逻辑
    // 骨架：直接放行
    next();
  };
};

/**
 * 从请求中获取限流标识符
 */
export const getRateLimitIdentifier = (req: Request, scope: 'api' | 'user' | 'admin'): string => {
  if (scope === 'user') {
    return (req as any).actor?.id || req.ip || 'anonymous';
  }
  if (scope === 'admin') {
    return (req as any).actor?.id || req.ip || 'anonymous';
  }
  // scope === 'api'
  return req.ip || 'anonymous';
};
