import { MedusaService } from "@medusajs/framework/utils";
import { BizProductReview } from "./models/product-review";

class ReviewService extends MedusaService({
  ProductReview: BizProductReview,
}) {}

export default ReviewService;
