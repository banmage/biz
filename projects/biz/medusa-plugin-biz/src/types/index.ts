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

// ─────────────────────────────────────────────────────────────────────────────
// API 路由请求体类型定义
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 入驻申请审核请求体
 */
export interface ReviewApplicationBody {
  action: 'approve' | 'reject';
  reject_reason?: string;
}

/**
 * 产品机构内审请求体
 */
export interface OrgReviewBody {
  action: 'approve' | 'reject';
  reject_reason?: string;
  scores?: {
    innovation: number;
    complexity: number;
    novelty: number;
  };
}

/**
 * 产品平台终审请求体
 */
export interface PlatformReviewBody {
  action: 'approve' | 'reject';
  reject_reason?: string;
  scores?: {
    innovation: number;
    complexity: number;
    novelty: number;
  };
}

/**
 * 评论审核请求体
 */
export interface ModerateReviewBody {
  action: 'approve' | 'hide' | 'unhide' | 'delete';
}

/**
 * 成员邀请响应请求体
 */
export interface RespondInvitationBody {
  action: 'accept' | 'decline';
}

/**
 * 成员邀请请求体
 */
export interface InviteMemberBody {
  email: string;
  role: OrgRole;
}

/**
 * 创建产品请求体
 */
export interface CreateProductBody {
  title: string;
  subtitle?: string;
  description?: string;
  handle?: string;
  status?: string;
  tags?: string[];
}

/**
 * 创建评论请求体
 */
export interface CreateReviewBody {
  content: string;
  scores: {
    overall: number;
    innovation: number;
    complexity: number;
    novelty: number;
  };
}

/**
 * 机构入驻申请请求体
 */
export interface SubmitApplicationBody {
  name: string;
  type: string;
  main_business_area?: string;
  license_file_id?: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
}

/**
 * 机构状态变更请求体
 */
export interface UpdateOrgStatusBody {
  event: 'suspend' | 'activate' | 'ban';
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
