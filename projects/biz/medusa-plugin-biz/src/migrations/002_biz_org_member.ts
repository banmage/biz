import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration002 extends Migration {
  async up(): Promise<void> {
    await this.knex.schema.createTable("biz_org_member", (table) => {
      table.string("id").primary();
      table.string("organization_id").notNullable();
      table.string("customer_id").notNullable();
      table
        .enum("role", ["creator", "approver", "maintainer", "member"])
        .notNullable();
      table
        .enum("status", ["pending", "active", "removed", "left"])
        .notNullable()
        .defaultTo("pending");
      table.string("invited_by").nullable();
      table.timestamp("invited_at").nullable();
      table.timestamp("joined_at").nullable();
      table
        .timestamp("created_at")
        .defaultTo(this.knex.fn.now())
        .notNullable();
      table.timestamp("updated_at").nullable();
      table.timestamp("deleted_at").nullable();
    });

    // 唯一索引：(organization_id, customer_id) WHERE deleted_at IS NULL
    await this.knex.raw(
      `CREATE UNIQUE INDEX idx_org_member_unique ON biz_org_member (organization_id, customer_id) WHERE deleted_at IS NULL`
    );
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
