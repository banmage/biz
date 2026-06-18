import { model } from "@medusajs/framework/utils";

export const BizProductExtension = model.define("biz_product_extension", {
  id: model.id().primaryKey(),
  product_id: model.text().unique().notNullable(),
  organization_id: model.text().nullable(),
  review_status: model.enum(["draft", "org_pending", "platform_pending", "published"]).notNullable().default("draft"),
  organization_innovation_score: model.number().nullable(),
  organization_complexity_score: model.number().nullable(),
  organization_novelty_score: model.number().nullable(),
  platform_innovation_score: model.number().nullable(),
  platform_complexity_score: model.number().nullable(),
  platform_novelty_score: model.number().nullable(),
  metadata: model.json().nullable(),
});
