import { model } from "@medusajs/framework/utils"

export const BizAuditLog = model.define("biz_audit_log", {
  id: model.id().primaryKey(),
  actor_type: model.enum(["user", "customer", "system"]),
  actor_id: model.text(),
  action: model.text(),
  target_type: model.text(),
  target_id: model.text(),
  result: model.enum(["success", "failure"]),
  details: model.json().nullable(),
})
