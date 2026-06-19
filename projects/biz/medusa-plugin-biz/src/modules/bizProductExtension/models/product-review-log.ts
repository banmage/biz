import { model } from "@medusajs/framework/utils"

export const BizProductReviewLog = model.define("biz_product_review_log", {
  id: model.id().primaryKey(),
  product_extension_id: model.text(),
  round: model.number(),
  reviewer_scope: model.enum(["org", "platform"]),
  reviewer_id: model.text(),
  action: model.enum(["submit", "approve", "reject"]),
  reject_reason: model.text().nullable(),
  reviewed_at: model.dateTime().default(new Date()),
})
