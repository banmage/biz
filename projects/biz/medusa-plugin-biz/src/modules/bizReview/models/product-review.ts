import { model } from "@medusajs/framework/utils"

export const BizProductReview = model.define("biz_product_review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text(),
  content: model.text(),
  overall_score: model.number(),
  innovation_score: model.number(),
  complexity_score: model.number(),
  novelty_score: model.number(),
  status: model.enum(["pending", "published", "hidden", "deleted"]).default("pending"),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
})
