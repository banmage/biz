import { model } from "@medusajs/framework/utils";

export const BizOrganizationApplication = model.define("biz_organization_application", {
  id: model.id().primaryKey(),
  applicant_id: model.text(),
  name: model.text(),
  type: model.text(),
  main_business_area: model.text().nullable(),
  license_file_id: model.text().nullable(),
  contact_name: model.text(),
  contact_phone: model.text(),
  contact_email: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  reject_reason: model.text().nullable(),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.timestamp().nullable(),
});
