/**
 * Admin Widget 区域配置注册
 * 
 * 此文件由 Medusa Admin 的 Vite 构建系统通过 virtual:medusa/widgets 加载
 * 每个 Widget 通过 defineWidgetConfig 声明注入区域
 */

export { config as organizationApplicationsWidget } from "./organization-applications/page"
export { config as organizationsWidget } from "./organizations/page"
export { config as productPlatformReviewWidget } from "./products/platform-review/page"
export { config as reviewsWidget } from "./reviews/page"
export { config as auditLogsWidget } from "./audit-logs/page"
export { config as rolesWidget } from "./roles/page"
export { config as notificationsWidget } from "./notifications/page"
