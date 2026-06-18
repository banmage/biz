import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration004 extends Migration {
  async up(): Promise<void> {
    await this.knex.schema.createTable("biz_product_review", (table) => {
      table.string("id").primary();
      table.string("product_id").notNullable();
      table.string("customer_id").notNullable();
      table.text("content").notNullable();
      table.integer("overall_score").notNullable();
      table.integer("innovation_score").notNullable();
      table.integer("complexity_score").notNullable();
      table.integer("novelty_score").notNullable();
      table.enum("status", ["pending", "published", "hidden", "deleted"]).notNullable().defaultTo("pending");
      table.string("reviewed_by").nullable();
      table.timestamp("reviewed_at").nullable();
      table.timestamp("created_at").defaultTo(this.knex.fn.now()).notNullable();
      table.timestamp("updated_at").nullable();
    });

    // Index on (product_id, status)
    await this.knex.schema.alterTable("biz_product_review", (table) => {
      table.index(["product_id", "status"], "idx_product_review_product_status");
    });
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
