import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration006 extends Migration {
  async up(): Promise<void> {
    await this.knex.schema.createTable("biz_audit_log", (table) => {
      table.string("id").primary();
      table.enum("actor_type", ["user", "customer", "system"]).notNullable();
      table.string("actor_id").notNullable();
      table.string("action").notNullable();
      table.string("target_type").notNullable();
      table.string("target_id").notNullable();
      table.enum("result", ["success", "failure"]).notNullable();
      table.json("details").nullable();
      table.timestamp("created_at").defaultTo(this.knex.fn.now()).notNullable();
    });

    // Create the deny function
    await this.knex.raw(`
      CREATE OR REPLACE FUNCTION deny_audit_log_modify() RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'biz_audit_log is append-only: UPDATE and DELETE are prohibited';
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create the trigger
    await this.knex.raw(`
      CREATE TRIGGER trigger_deny_audit_log_modify
      BEFORE UPDATE OR DELETE ON biz_audit_log
      FOR EACH ROW EXECUTE FUNCTION deny_audit_log_modify();
    `);
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
