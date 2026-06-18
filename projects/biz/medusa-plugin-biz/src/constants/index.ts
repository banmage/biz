/**
 * 常量定义
 */

export const BIZ_TABLE_PREFIX = 'biz_';

export const MODULES = {
  ORGANIZATION: 'bizOrganization',
  ORG_MEMBER: 'bizOrgMember',
  PRODUCT_EXTENSION: 'bizProductExtension',
  REVIEW: 'bizReview',
  NOTIFICATION: 'bizNotification',
  AUDIT_LOG: 'bizAuditLog',
} as const;

export const MIGRATION_ORDER = [
  { id: '001', module: 'bizOrganization', description: '机构域 + 入驻申请' },
  { id: '002', module: 'bizOrgMember', description: '机构成员域' },
  { id: '003', module: 'bizProductExtension', description: '产品扩展域 + 审核日志' },
  { id: '004', module: 'bizReview', description: '评论打分域' },
  { id: '005', module: 'bizNotification', description: '通知域' },
  { id: '006', module: 'bizAuditLog', description: '审计日志域' },
  { id: '007', module: 'bizUploadSecurity', description: '上传安全（预留）' },
  { id: '008', module: 'bizSoftDelete', description: '软删除' },
] as const;
