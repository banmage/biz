/**
 * 事务辅助工具 — 支持 afterCommit 回调
 * 
 * 注意：EntityManager 通过运行时容器解析获取，类型仅为编译时提示
 */

/**
 * 在事务中执行函数，支持 afterCommit 钩子
 * 
 * 使用方式：
 * ```ts
 * const result = await runInTransaction(
 *   manager,
 *   async (tx) => {
 *     // 业务逻辑
 *     return someResult;
 *   },
 *   async (result) => {
 *     // afterCommit：写审计日志、发通知等
 *   }
 * );
 * ```
 */
export const runInTransaction = async <T>(
  entityManager: any,
  fn: (manager: any) => Promise<T>,
  afterCommit?: (result: T) => Promise<void>
): Promise<T> => {
  const result = await entityManager.transaction(async (tx: any) => {
    return await fn(tx);
  });

  // 事务提交后执行 afterCommit（用于审计日志、通知等非核心操作）
  if (afterCommit) {
    try {
      await afterCommit(result);
    } catch (e) {
      // 失败仅记录日志，不阻塞主流程
      const logger = entityManager.connection?.logger;
      if (logger) {
        logger.warn('afterCommit hook failed', e);
      }
    }
  }

  return result;
};
