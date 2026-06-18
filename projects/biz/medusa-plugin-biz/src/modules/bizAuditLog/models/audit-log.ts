import { model } from "@medusajs/framework/utils";

export const BizAuditLog = model.define("biz_audit_log", {
  id: model.id().primaryKey(),
  actor_type: model.enum(["user", "customer", "system"]).notNullable(),
  actor_id: model.text().notNullable(),
  action: model.text().notNullable(),
  target_type: model.text().notNullable(),
  target_id: model.text().notNullable(),
  result: model.enum(["success", "failure"]).notNullable(),
  details: model.json().nullable(),
});
