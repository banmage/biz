import { model } from "@medusajs/framework/utils";

export const BizOrgMember = model.define("biz_org_member", {
  id: model.id().primaryKey(),
  organization_id: model.text(),
  customer_id: model.text(),
  role: model.enum(["creator", "approver", "maintainer", "member"]),
  status: model.enum(["pending", "active", "removed", "left"]).default("pending"),
  invited_by: model.text().nullable(),
  invited_at: model.timestamp().nullable(),
  joined_at: model.timestamp().nullable(),
});
