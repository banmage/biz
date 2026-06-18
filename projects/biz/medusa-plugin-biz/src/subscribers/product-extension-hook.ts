/**
 * productsCreated Hook — 兜底机制
 * 
 * 触发时机：任何 Product 创建完成后（AFTER_COMMIT）
 * 职责：确保"任何 Product 必有 ProductExtension"
 * 
 * 并发安全：使用 INSERT ... ON CONFLICT (product_id) DO NOTHING
 */

import { randomBytes } from "crypto";

export default async function productExtensionHook({
  event,
  data,
  container,
}: any) {
  const { products, additional_data } = data;
  const logger = container.resolve("logger");

  // 从容器解析服务
  const productExtensionRepo = container.resolve("productExtension");
  const knex = container.resolve("knex");

  for (const product of products) {
    try {
      const orgId = additional_data?.organization_id || null;

      // 使用 INSERT ON CONFLICT 处理高并发
      await knex("biz_product_extension")
        .insert({
          id: randomBytes(16).toString("hex"),
          product_id: product.id,
          organization_id: orgId,
          review_status: "draft",
        })
        .onConflict("product_id")
        .ignore();

      // 若 orgId 为 NULL，查询超级管理员并发送告警通知
      if (!orgId) {
        try {
          const userService = container.resolve("userService");
          const notificationService = container.resolve("notificationService");

          const superAdminUsers = await userService.list({
            where: { metadata: { biz_role: "super_admin" } },
          });

          for (const admin of superAdminUsers) {
            await notificationService.create({
              recipient_type: "user",
              recipient_id: admin.id,
              type: "product_extension_orphan",
              title: "未归属机构的产品扩展",
              content: `产品 ${product.id} 创建时未关联机构，请手动处理`,
            });
          }
        } catch (notifyError) {
          logger.warn(
            `Failed to send orphan product notification for product ${product.id}`,
            notifyError
          );
        }
      }
    } catch (e: any) {
      // 唯一约束冲突时静默忽略（另一请求已创建）
      if (e.code === "23505") {
        continue;
      }
      logger.error(
        `Failed to create ProductExtension for product ${product.id}`,
        e
      );
    }
  }
}
