/**
 * Actor 类型定义 — 统一身份模型
 * 
 * 平台角色：仅从 User.metadata.biz_role 读取
 * 机构角色：仅从 OrgMember.role 读取
 * ❌ 严禁混用
 */

export type PlatformRole = 'super_admin' | 'admin' | 'reviewer';
export type OrgRole = 'creator' | 'approver' | 'maintainer' | 'member';
export type ActorType = 'user' | 'customer';

export interface Actor {
  type: ActorType;
  id: string;
  orgId?: string;              // 若为机构成员，必填
  platformRole?: PlatformRole; // 仅从 User.metadata.biz_role 读取
  orgRole?: OrgRole;           // 仅从 OrgMember.role 读取
}

/**
 * 权限校验函数
 */

/**
 * 校验平台角色
 * 仅从 actor.platformRole 校验（来源：User.metadata.biz_role）
 */
export const requirePlatformRole = (actor: Actor | undefined, roles: PlatformRole[]): boolean => {
  if (!actor || !actor.platformRole) return false;
  return roles.includes(actor.platformRole);
};

/**
 * 校验机构角色
 * 仅从 actor.orgRole 校验（来源：OrgMember.role）
 */
export const requireOrgRole = (actor: Actor | undefined, roles: OrgRole[]): boolean => {
  if (!actor || !actor.orgRole) return false;
  return roles.includes(actor.orgRole);
};
