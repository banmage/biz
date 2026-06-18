import { model } from "@medusajs/framework/utils";

export const BizProductReviewLog = model.define("biz_product_review_log", {
  id: model.id().primaryKey(),
  product_extension_id: model.text().notNullable(),
  round: model.number().notNullable(),
  reviewer_scope: model.enum(["org", "platform"]).notNullable(),
  reviewer_id: model.text().notNullable(),
  action: model.enum(["submit", "approve", "reject"]).notNullable(),
  reject_reason: model.text().nullable(),
  reviewed_at: model.timestamp().defaultTo(new Date()),
});
