import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration001 extends Migration {
  async up(): Promise<void> {
    await this.knex.schema.createTable("biz_organization", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("type").notNullable();
      table.text("main_business_area").nullable();
      table
        .enum("status", ["active", "suspended", "banned"])
        .notNullable()
        .defaultTo("active");
      table.string("contact_name").notNullable();
      table.string("contact_phone").notNullable();
      table.string("contact_email").nullable();
      table.string("license_file_id").nullable();
      table
        .timestamp("created_at")
        .defaultTo(this.knex.fn.now())
        .notNullable();
      table.timestamp("updated_at").nullable();
      table.timestamp("deleted_at").nullable();
    });

    await this.knex.schema.createTable(
      "biz_organization_application",
      (table) => {
        table.string("id").primary();
        table.string("applicant_id").notNullable();
        table.string("name").notNullable();
        table.string("type").notNullable();
        table.text("main_business_area").nullable();
        table.string("license_file_id").nullable();
        table.string("contact_name").notNullable();
        table.string("contact_phone").notNullable();
        table.string("contact_email").nullable();
        table
          .enum("status", ["pending", "approved", "rejected"])
          .notNullable()
          .defaultTo("pending");
        table.text("reject_reason").nullable();
        table.string("reviewed_by").nullable();
        table.timestamp("reviewed_at").nullable();
        table
          .timestamp("created_at")
          .defaultTo(this.knex.fn.now())
          .notNullable();
        table.timestamp("updated_at").nullable();
        table.timestamp("deleted_at").nullable();
      }
    );
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
