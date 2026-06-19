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
    // 解析核心 User 模块服务
    const userService = container.resolve('userService');
    if (!userService) {
      logger.error('userService not found in container, cannot seed super admin');
      return;
    }

    // 查找指定邮箱的用户
    const users = await userService.list({ email: email.trim().toLowerCase() });

    if (!users || users.length === 0) {
      logger.warn(`No user found with email: ${email}. Please create the user first via Admin UI or API, then re-run the seed.`);
      return;
    }

    const user = users[0];

    // 幂等更新：设置 metadata.biz_role = 'super_admin'
    const currentMetadata = user.metadata || {};
    if (currentMetadata.biz_role === 'super_admin') {
      logger.info(`User ${email} is already super_admin, skipping`);
      return;
    }

    await userService.update(user.id, {
      metadata: {
        ...currentMetadata,
        biz_role: 'super_admin',
      },
    });

    logger.info(`Successfully set super_admin role for user: ${email} (id: ${user.id})`);
  } catch (error) {
    logger.error('Failed to seed super admin', error);
    throw error; // 种子脚本失败应该抛出，让调用方知晓
  }
}
