/**
 * Module Links — 跨模块关联
 * 
 * OrgMember ↔ Customer 链接
 * 用于成员关联查询
 */
import { defineLink } from "@medusajs/framework/utils";
import CustomerModule from "@medusajs/medusa/customer";
import BizOrgMemberModule from "../modules/bizOrgMember";

export default defineLink(
  CustomerModule.linkable.customer,
  (BizOrgMemberModule as any).linkable.orgMember
);
