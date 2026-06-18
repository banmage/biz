import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration008 extends Migration {
  async up(): Promise<void> {
    // 为 Organization 添加 deleted_at 字段（如果不存在）
    await this.knex.schema.alterTable("biz_organization", (table) => {
      table.timestamp("deleted_at").nullable();
    });

    // 为 OrgMember 添加 deleted_at 字段（如果不存在）
    await this.knex.schema.alterTable("biz_org_member", (table) => {
      table.timestamp("deleted_at").nullable();
    });

    // 注意：ProductExtension 随 Product 级联删除，不单独软删除
    // ProductReview 已有 deleted 状态机，不加 deleted_at
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
