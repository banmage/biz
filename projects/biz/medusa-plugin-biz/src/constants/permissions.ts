/**
 * 权限码枚举
 */
export enum Permission {
  // 机构级
  ORG_INVITE_MEMBER = 'org:invite_member',
  ORG_REMOVE_MEMBER = 'org:remove_member',
  ORG_UPDATE_PROFILE = 'org:update_profile',

  // 产品级
  PRODUCT_SUBMIT_REVIEW = 'product:submit_review',
  PRODUCT_ORG_REVIEW = 'product:org_review',
  PRODUCT_VIEW = 'product:view',

  // 通知
  NOTIFICATION_VIEW = 'notification:view',
}
