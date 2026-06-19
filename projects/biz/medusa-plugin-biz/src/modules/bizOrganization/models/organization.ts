import { model } from "@medusajs/framework/utils"

export const BizOrganization = model.define("biz_organization", {
  id: model.id().primaryKey(),
  name: model.text(),
  type: model.text(),
  main_business_area: model.text().nullable(),
  status: model.enum(["active", "suspended", "banned"]).default("active"),
  contact_name: model.text(),
  contact_phone: model.text(),
  contact_email: model.text().nullable(),
  license_file_id: model.text().nullable(),
})
