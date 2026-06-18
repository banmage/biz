import { MedusaService } from "@medusajs/framework/utils";
import { BizNotification } from "./models/notification";

class NotificationService extends MedusaService({
  Notification: BizNotification,
}) {}

export default NotificationService;
