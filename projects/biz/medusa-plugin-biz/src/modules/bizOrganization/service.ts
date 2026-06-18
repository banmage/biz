import { MedusaService } from "@medusajs/framework/utils";
import { BizOrganization } from "./models/organization";
import { BizOrganizationApplication } from "./models/organization-application";

class OrganizationService extends MedusaService({
  Organization: BizOrganization,
  OrganizationApplication: BizOrganizationApplication,
}) {}

export default OrganizationService;
