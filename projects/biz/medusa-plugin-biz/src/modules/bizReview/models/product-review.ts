import { model } from "@medusajs/framework/utils";

export const BizProductReview = model.define("biz_product_review", {
  id: model.id().primaryKey(),
  product_id: model.text().notNullable(),
  customer_id: model.text().notNullable(),
  content: model.text().notNullable(),
  overall_score: model.number().notNullable(),
  innovation_score: model.number().notNullable(),
  complexity_score: model.number().notNullable(),
  novelty_score: model.number().notNullable(),
  status: model.enum(["pending", "published", "hidden", "deleted"]).notNullable().default("pending"),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.timestamp().nullable(),
});
