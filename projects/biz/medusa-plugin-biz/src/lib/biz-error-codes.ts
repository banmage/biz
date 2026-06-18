/**
 * BizErrorCode — 全部 MVP 错误码
 */

export enum BizErrorCode {
  // 全局级
  BIZ_VALIDATION_ERROR = 'BIZ_VALIDATION_ERROR',           // 400
  BIZ_UNAUTHORIZED = 'BIZ_UNAUTHORIZED',                   // 401
  BIZ_FORBIDDEN = 'BIZ_FORBIDDEN',                         // 403
  BIZ_NOT_FOUND = 'BIZ_NOT_FOUND',                         // 404
  BIZ_INVALID_STATE_TRANSITION = 'BIZ_INVALID_STATE_TRANSITION', // 409
  BIZ_INTERNAL_ERROR = 'BIZ_INTERNAL_ERROR',               // 500

  // 机构级
  BIZ_ORG_ROLE_NO_PERMISSION = 'BIZ_ORG_ROLE_NO_PERMISSION',     // 403
  BIZ_ORG_CREATOR_CANNOT_LEAVE = 'BIZ_ORG_CREATOR_CANNOT_LEAVE', // 409
  BIZ_ORG_CREATOR_CANNOT_BE_REMOVED = 'BIZ_ORG_CREATOR_CANNOT_BE_REMOVED', // 409
  BIZ_ORG_MEMBER_ALREADY_EXISTS = 'BIZ_ORG_MEMBER_ALREADY_EXISTS', // 409

  // 平台级
  BIZ_PLATFORM_ROLE_NO_PERMISSION = 'BIZ_PLATFORM_ROLE_NO_PERMISSION', // 403

  // 评论级
  BIZ_REVIEW_TEXT_TOO_SHORT = 'BIZ_REVIEW_TEXT_TOO_SHORT', // 400

  // 申请级
  BIZ_APPLICATION_ALREADY_EXISTS = 'BIZ_APPLICATION_ALREADY_EXISTS', // 409
}

/**
 * 错误码 → 中文默认消息
 */
export const DEFAULT_ERROR_MESSAGES: Record<BizErrorCode, string> = {
  [BizErrorCode.BIZ_VALIDATION_ERROR]: '请求参数校验失败',
  [BizErrorCode.BIZ_UNAUTHORIZED]: '未登录或认证已过期',
  [BizErrorCode.BIZ_FORBIDDEN]: '无权限执行此操作',
  [BizErrorCode.BIZ_NOT_FOUND]: '资源不存在',
  [BizErrorCode.BIZ_INVALID_STATE_TRANSITION]: '当前状态不允许此操作',
  [BizErrorCode.BIZ_INTERNAL_ERROR]: '服务器内部错误',

  [BizErrorCode.BIZ_ORG_ROLE_NO_PERMISSION]: '您的机构角色无此权限',
  [BizErrorCode.BIZ_ORG_CREATOR_CANNOT_LEAVE]: '机构创建人不可退出机构',
  [BizErrorCode.BIZ_ORG_CREATOR_CANNOT_BE_REMOVED]: '不可移除机构创建人',
  [BizErrorCode.BIZ_ORG_MEMBER_ALREADY_EXISTS]: '该成员已存在于机构中',

  [BizErrorCode.BIZ_PLATFORM_ROLE_NO_PERMISSION]: '您的平台角色无此权限',

  [BizErrorCode.BIZ_REVIEW_TEXT_TOO_SHORT]: '评论内容不能少于10个字符',

  [BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS]: '您已有进行中的入驻申请，请勿重复提交',
};

/**
 * 错误码 → HTTP 状态码
 */
export const ERROR_HTTP_STATUS_MAP: Record<BizErrorCode, number> = {
  [BizErrorCode.BIZ_VALIDATION_ERROR]: 400,
  [BizErrorCode.BIZ_UNAUTHORIZED]: 401,
  [BizErrorCode.BIZ_FORBIDDEN]: 403,
  [BizErrorCode.BIZ_NOT_FOUND]: 404,
  [BizErrorCode.BIZ_INVALID_STATE_TRANSITION]: 409,
  [BizErrorCode.BIZ_INTERNAL_ERROR]: 500,

  [BizErrorCode.BIZ_ORG_ROLE_NO_PERMISSION]: 403,
  [BizErrorCode.BIZ_ORG_CREATOR_CANNOT_LEAVE]: 409,
  [BizErrorCode.BIZ_ORG_CREATOR_CANNOT_BE_REMOVED]: 409,
  [BizErrorCode.BIZ_ORG_MEMBER_ALREADY_EXISTS]: 409,

  [BizErrorCode.BIZ_PLATFORM_ROLE_NO_PERMISSION]: 403,

  [BizErrorCode.BIZ_REVIEW_TEXT_TOO_SHORT]: 400,

  [BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS]: 409,
};

/**
 * BizError — 统一业务错误类
 */
export class BizError extends Error {
  public readonly code: BizErrorCode;
  public readonly httpStatus: number;

  constructor(code: BizErrorCode, message?: string) {
    super(message || DEFAULT_ERROR_MESSAGES[code]);
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS_MAP[code];
    this.name = 'BizError';
  }
}
