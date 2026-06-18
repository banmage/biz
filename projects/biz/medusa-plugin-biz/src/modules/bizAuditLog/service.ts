import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizAuditLog } from "./models/audit-log";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { successResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";

class AuditLogService extends MedusaService({
  AuditLog: BizAuditLog,
}) {
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 写入审计日志（仅 INSERT）
   * 应在 afterCommit 中调用，失败不阻塞主事务
   */
  async writeAuditLog(data: {
    actorType: "user" | "customer" | "system";
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    result: "success" | "failure";
    details?: any;
  }) {
    try {
      const manager = this.container.resolve("manager") as EntityManager;
      const repo = manager.getRepository(BizAuditLog);

      const log = repo.create({
        actor_type: data.actorType,
        actor_id: data.actorId,
        action: data.action,
        target_type: data.targetType,
        target_id: data.targetId,
        result: data.result,
        details: data.details || null,
      });

      await repo.persistAndFlush(log);
      return log;
    } catch (e) {
      // 审计日志写入失败仅记录，不抛出
      const logger = this.container.resolve("logger");
      if (logger) {
        logger.error("Audit log write failed", e);
      }
      return null;
    }
  }

  /**
   * 查询审计日志（只读，分页）
   */
  async queryAuditLogs(query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizAuditLog);
    const { limit, offset } = parsePagination(query);

    const where: any = {};
    if (query.target_type) where.target_type = query.target_type;
    if (query.target_id) where.target_id = query.target_id;
    if (query.actor_type) where.actor_type = query.actor_type;
    if (query.actor_id) where.actor_id = query.actor_id;

    const [rows, total] = await repo.findAndCount(where, {
      limit,
      offset,
      orderBy: { created_at: "DESC" },
    });

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }
}

export default AuditLogService;
