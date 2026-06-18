/**
 * 机构角色权限映射（静态配置）
 * 
 * 定义每种机构角色对应的权限码
 */
import { Permission } from "../constants/permissions";

export const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  creator: [
    Permission.ORG_INVITE_MEMBER,
    Permission.ORG_REMOVE_MEMBER,
    Permission.ORG_UPDATE_PROFILE,
    Permission.PRODUCT_SUBMIT_REVIEW,
    Permission.PRODUCT_ORG_REVIEW,
    Permission.PRODUCT_VIEW,
    Permission.NOTIFICATION_VIEW,
  ],
  approver: [
    Permission.PRODUCT_ORG_REVIEW,
    Permission.PRODUCT_VIEW,
    Permission.NOTIFICATION_VIEW,
  ],
  maintainer: [
    Permission.PRODUCT_SUBMIT_REVIEW,
    Permission.PRODUCT_VIEW,
    Permission.NOTIFICATION_VIEW,
  ],
  member: [
    Permission.PRODUCT_VIEW,
    Permission.NOTIFICATION_VIEW,
  ],
};

/**
 * 检查机构角色是否有指定权限
 */
export const hasOrgPermission = (role: string, permission: string): boolean => {
  const permissions = ORG_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};
