import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class extends Migration {
  async up(): Promise<void> {
    const knex = this.knex;

    await knex.schema.createTable("biz_product_extension", (table) => {
      table.string("id").primary();
      table.string("product_id").unique().notNullable();
      table.string("organization_id").nullable();
      table
        .enum("review_status", [
          "draft",
          "org_pending",
          "platform_pending",
          "published",
        ])
        .notNullable()
        .defaultTo("draft");
      table.integer("organization_innovation_score").nullable();
      table.integer("organization_complexity_score").nullable();
      table.integer("organization_novelty_score").nullable();
      table.integer("platform_innovation_score").nullable();
      table.integer("platform_complexity_score").nullable();
      table.integer("platform_novelty_score").nullable();
      table.json("metadata").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").nullable();
      table.timestamp("deleted_at").nullable();

      table.index(["review_status"]);
    });

    await knex.schema.createTable("biz_product_review_log", (table) => {
      table.string("id").primary();
      table.string("product_extension_id").notNullable();
      table.integer("round").notNullable();
      table.enum("reviewer_scope", ["org", "platform"]).notNullable();
      table.string("reviewer_id").notNullable();
      table.enum("action", ["submit", "approve", "reject"]).notNullable();
      table.text("reject_reason").nullable();
      table.timestamp("reviewed_at").defaultTo(knex.fn.now());

      table.unique(["product_extension_id", "round"]);
    });
  }

  async down(): Promise<void> {
    // Production does not support rollback of this migration.
  }
}
