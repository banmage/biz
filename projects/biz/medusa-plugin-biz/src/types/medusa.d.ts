/**
 * Medusa 类型扩展声明
 *
 * 扩展 Medusa Framework 的类型定义，解决插件中的类型错误
 */

import { Knex } from 'knex';

// ─────────────────────────────────────────────────────────────────────────────
// MedusaRequest 扩展
// ─────────────────────────────────────────────────────────────────────────────

declare module '@medusajs/framework/http' {
  interface MedusaRequest<
    Body = unknown,
    Params = Record<string, unknown>
  > {
    /**
     * 统一身份模型
     * 由中间件 resolvePlatform / resolveOrg 挂载
     */
    actor?: import('./index').Actor;

    /**
     * 请求体（带类型）
     */
    body: Body;

    /**
     * 路径参数
     */
    params: Params;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration 扩展（MikroORM 迁移基类）
// ─────────────────────────────────────────────────────────────────────────────

declare module '@medusajs/framework/mikro-orm/migrations' {
  interface Migration {
    /**
     * Knex 实例，用于执行迁移
     */
    knex: Knex;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 扩展 Express Request（用于 error-handler）
// ─────────────────────────────────────────────────────────────────────────────

declare module 'express' {
  interface Request {
    /**
     * Medusa 容器实例
     */
    container?: any;
  }
}