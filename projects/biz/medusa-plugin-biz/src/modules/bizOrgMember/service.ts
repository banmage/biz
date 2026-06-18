import { MedusaService } from "@medusajs/framework/utils";
import { BizOrgMember } from "./models/org-member";

class OrgMemberService extends MedusaService({
  OrgMember: BizOrgMember,
}) {}

export default OrgMemberService;
