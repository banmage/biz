import { model } from "@medusajs/framework/utils"

export const BizNotification = model.define("biz_notification", {
  id: model.id().primaryKey(),
  recipient_type: model.enum(["user", "customer"]),
  recipient_id: model.text(),
  type: model.text(),
  title: model.text(),
  content: model.text(),
  is_read: model.boolean().default(false),
  related_entity_type: model.text().nullable(),
  related_entity_id: model.text().nullable(),
})
