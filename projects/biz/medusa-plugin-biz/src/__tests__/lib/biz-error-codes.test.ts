import {
  BizErrorCode,
  DEFAULT_ERROR_MESSAGES,
  ERROR_HTTP_STATUS_MAP,
  BizError,
} from "../../lib/biz-error-codes"

describe("BizErrorCode", () => {
  it("should have all 13 error codes", () => {
    const codes = Object.values(BizErrorCode)
    expect(codes).toHaveLength(13)
  })

  it("should have all required error codes", () => {
    expect(BizErrorCode.BIZ_VALIDATION_ERROR).toBe("BIZ_VALIDATION_ERROR")
    expect(BizErrorCode.BIZ_UNAUTHORIZED).toBe("BIZ_UNAUTHORIZED")
    expect(BizErrorCode.BIZ_FORBIDDEN).toBe("BIZ_FORBIDDEN")
    expect(BizErrorCode.BIZ_NOT_FOUND).toBe("BIZ_NOT_FOUND")
    expect(BizErrorCode.BIZ_INVALID_STATE_TRANSITION).toBe("BIZ_INVALID_STATE_TRANSITION")
    expect(BizErrorCode.BIZ_INTERNAL_ERROR).toBe("BIZ_INTERNAL_ERROR")
    expect(BizErrorCode.BIZ_ORG_ROLE_NO_PERMISSION).toBe("BIZ_ORG_ROLE_NO_PERMISSION")
    expect(BizErrorCode.BIZ_ORG_CREATOR_CANNOT_LEAVE).toBe("BIZ_ORG_CREATOR_CANNOT_LEAVE")
    expect(BizErrorCode.BIZ_ORG_CREATOR_CANNOT_BE_REMOVED).toBe("BIZ_ORG_CREATOR_CANNOT_BE_REMOVED")
    expect(BizErrorCode.BIZ_ORG_MEMBER_ALREADY_EXISTS).toBe("BIZ_ORG_MEMBER_ALREADY_EXISTS")
    expect(BizErrorCode.BIZ_PLATFORM_ROLE_NO_PERMISSION).toBe("BIZ_PLATFORM_ROLE_NO_PERMISSION")
    expect(BizErrorCode.BIZ_REVIEW_TEXT_TOO_SHORT).toBe("BIZ_REVIEW_TEXT_TOO_SHORT")
    expect(BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS).toBe("BIZ_APPLICATION_ALREADY_EXISTS")
  })
})

describe("DEFAULT_ERROR_MESSAGES", () => {
  it("should have a message for every error code", () => {
    for (const code of Object.values(BizErrorCode)) {
      expect(DEFAULT_ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof DEFAULT_ERROR_MESSAGES[code]).toBe("string")
      expect(DEFAULT_ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    }
  })

  it("should have correct messages for key codes", () => {
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_VALIDATION_ERROR]).toBe("请求参数校验失败")
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_UNAUTHORIZED]).toBe("未登录或认证已过期")
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_FORBIDDEN]).toBe("无权限执行此操作")
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_NOT_FOUND]).toBe("资源不存在")
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_INVALID_STATE_TRANSITION]).toBe("当前状态不允许此操作")
    expect(DEFAULT_ERROR_MESSAGES[BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS]).toBe("您已有进行中的入驻申请，请勿重复提交")
  })
})

describe("ERROR_HTTP_STATUS_MAP", () => {
  it("should have a status for every error code", () => {
    for (const code of Object.values(BizErrorCode)) {
      expect(ERROR_HTTP_STATUS_MAP[code]).toBeDefined()
      expect(typeof ERROR_HTTP_STATUS_MAP[code]).toBe("number")
    }
  })

  it("should map correct HTTP status codes", () => {
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_VALIDATION_ERROR]).toBe(400)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_UNAUTHORIZED]).toBe(401)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_FORBIDDEN]).toBe(403)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_NOT_FOUND]).toBe(404)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_INVALID_STATE_TRANSITION]).toBe(409)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_INTERNAL_ERROR]).toBe(500)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_ORG_ROLE_NO_PERMISSION]).toBe(403)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_ORG_CREATOR_CANNOT_LEAVE]).toBe(409)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_ORG_CREATOR_CANNOT_BE_REMOVED]).toBe(409)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_ORG_MEMBER_ALREADY_EXISTS]).toBe(409)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_PLATFORM_ROLE_NO_PERMISSION]).toBe(403)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_REVIEW_TEXT_TOO_SHORT]).toBe(400)
    expect(ERROR_HTTP_STATUS_MAP[BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS]).toBe(409)
  })
})

describe("BizError", () => {
  it("should create error with code and httpStatus", () => {
    const err = new BizError(BizErrorCode.BIZ_VALIDATION_ERROR)
    expect(err.code).toBe(BizErrorCode.BIZ_VALIDATION_ERROR)
    expect(err.httpStatus).toBe(400)
    expect(err.name).toBe("BizError")
  })

  it("should use default message when no custom message provided", () => {
    const err = new BizError(BizErrorCode.BIZ_NOT_FOUND)
    expect(err.message).toBe("资源不存在")
  })

  it("should use custom message when provided", () => {
    const err = new BizError(BizErrorCode.BIZ_VALIDATION_ERROR, "自定义错误")
    expect(err.message).toBe("自定义错误")
  })

  it("should be an instance of Error", () => {
    const err = new BizError(BizErrorCode.BIZ_INTERNAL_ERROR)
    expect(err).toBeInstanceOf(Error)
  })

  // AI 自检：BizErrorCode 枚举数 = DEFAULT_ERROR_MESSAGES key 数 = ERROR_HTTP_STATUS_MAP key 数
  it("should have consistent count across all error code collections", () => {
    const enumCount = Object.values(BizErrorCode).length
    const messagesCount = Object.keys(DEFAULT_ERROR_MESSAGES).length
    const statusCount = Object.keys(ERROR_HTTP_STATUS_MAP).length
    expect(enumCount).toBe(messagesCount)
    expect(enumCount).toBe(statusCount)
  })
})
