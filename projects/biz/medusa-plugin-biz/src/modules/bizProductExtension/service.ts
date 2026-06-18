import { MedusaService } from "@medusajs/framework/utils";
import { BizProductExtension } from "./models/product-extension";
import { BizProductReviewLog } from "./models/product-review-log";

class ProductExtensionService extends MedusaService({
  ProductExtension: BizProductExtension,
  ProductReviewLog: BizProductReviewLog,
}) {}

export default ProductExtensionService;
