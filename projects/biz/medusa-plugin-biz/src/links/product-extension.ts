/**
 * Module Links — 跨模块关联
 * 
 * Product ↔ ProductExtension 链接
 * 使前端能通过 query.graph 一次性加载 Product 及其 Extension
 */
import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import BizProductExtensionModule from "../modules/bizProductExtension";

export default defineLink(
  ProductModule.linkable.product,
  BizProductExtensionModule.linkable.productExtension
);
