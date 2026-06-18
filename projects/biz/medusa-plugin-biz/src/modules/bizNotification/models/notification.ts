import { model } from "@medusajs/framework/utils";

export const BizNotification = model.define("biz_notification", {
  id: model.id().primaryKey(),
  recipient_type: model.enum(["user", "customer"]).notNullable(),
  recipient_id: model.text().notNullable(),
  type: model.text().notNullable(),
  title: model.text().notNullable(),
  content: model.text().notNullable(),
  is_read: model.boolean().notNullable().default(false),
  related_entity_type: model.text().nullable(),
  related_entity_id: model.text().nullable(),
});
