import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration005 extends Migration {
  async up(): Promise<void> {
    await this.knex.schema.createTable("biz_notification", (table) => {
      table.string("id").primary();
      table.enum("recipient_type", ["user", "customer"]).notNullable();
      table.string("recipient_id").notNullable();
      table.string("type").notNullable();
      table.string("title").notNullable();
      table.text("content").notNullable();
      table.boolean("is_read").notNullable().defaultTo(false);
      table.string("related_entity_type").nullable();
      table.string("related_entity_id").nullable();
      table.timestamp("created_at").defaultTo(this.knex.fn.now()).notNullable();
    });

    // Composite index: (recipient_type, recipient_id, is_read, created_at DESC)
    await this.knex.raw(
      `CREATE INDEX idx_biz_notification_query ON biz_notification (recipient_type, recipient_id, is_read, created_at DESC)`
    );
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
