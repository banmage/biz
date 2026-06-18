import { MedusaService } from "@medusajs/framework/utils";
import { BizAuditLog } from "./models/audit-log";

class AuditLogService extends MedusaService({
  AuditLog: BizAuditLog,
}) {}

export default AuditLogService;
