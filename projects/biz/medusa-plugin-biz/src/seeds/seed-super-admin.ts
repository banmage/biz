/**
 * 种子脚本：创建初始超级管理员
 * 
 * 环境变量：BIZ_INITIAL_SUPER_ADMIN_EMAIL
 * 
 * 逻辑：查找指定邮箱的 User，将其 metadata.biz_role 设置为 'super_admin'
 * 幂等：可多次执行，已存在的不重复覆盖
 */

export default async function seedSuperAdmin({ container }: { container: any }) {
  const logger = container.resolve('logger');
  const email = process.env.BIZ_INITIAL_SUPER_ADMIN_EMAIL;

  if (!email) {
    logger.warn('BIZ_INITIAL_SUPER_ADMIN_EMAIL not set, skipping super admin seed');
    return;
  }

  try {
    // 注意：Medusa v2 中 User 服务通过 userModule 获取
    // 实际实现时需要根据 Medusa v2 的模块注册机制调用
    logger.info(`Seeding super admin with email: ${email}`);
    logger.warn('Super admin seed: actual implementation depends on Medusa v2 User module API');
  } catch (error) {
    logger.error('Failed to seed super admin', error);
  }
}
