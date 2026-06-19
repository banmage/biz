import { assertTransition, canTransition } from "../lib/state-machine"
import { BizError, BizErrorCode } from "../lib/biz-error-codes"

const ORG_TRANSITIONS: Record<string, Record<string, string>> = {
  active: { suspend: "suspended", ban: "banned" },
  suspended: { activate: "active", ban: "banned" },
  banned: { activate: "active" },
}

const APPLICATION_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { approve: "approved", reject: "rejected" },
}

describe("assertTransition", () => {
  it("should return target state for valid transition", () => {
    const result = assertTransition(ORG_TRANSITIONS, "active", "suspend")
    expect(result).toBe("suspended")
  })

  it("should throw BizError for invalid transition", () => {
    expect(() => {
      assertTransition(ORG_TRANSITIONS, "active", "approve")
    }).toThrow(BizError)
  })

  it("should throw BizError with BIZ_INVALID_STATE_TRANSITION code", () => {
    try {
      assertTransition(ORG_TRANSITIONS, "active", "approve")
    } catch (e: any) {
      expect(e.code).toBe(BizErrorCode.BIZ_INVALID_STATE_TRANSITION)
      expect(e.httpStatus).toBe(409)
    }
  })

  it("should throw BizError for non-existent state", () => {
    expect(() => {
      assertTransition(ORG_TRANSITIONS, "nonexistent", "approve")
    }).toThrow(BizError)
  })

  it("should handle application transitions correctly", () => {
    expect(assertTransition(APPLICATION_TRANSITIONS, "pending", "approve")).toBe("approved")
    expect(assertTransition(APPLICATION_TRANSITIONS, "pending", "reject")).toBe("rejected")
  })

  it("should reject transition from approved state", () => {
    expect(() => {
      assertTransition(APPLICATION_TRANSITIONS, "approved", "approve")
    }).toThrow(BizError)
  })
})

describe("canTransition", () => {
  it("should return true for valid transition", () => {
    expect(canTransition(ORG_TRANSITIONS, "active", "suspend")).toBe(true)
  })

  it("should return false for invalid transition", () => {
    expect(canTransition(ORG_TRANSITIONS, "active", "approve")).toBe(false)
  })

  it("should return false for non-existent state", () => {
    expect(canTransition(ORG_TRANSITIONS, "nonexistent", "approve")).toBe(false)
  })

  it("should return false for terminal state", () => {
    expect(canTransition(APPLICATION_TRANSITIONS, "approved", "approve")).toBe(false)
    expect(canTransition(APPLICATION_TRANSITIONS, "rejected", "reject")).toBe(false)
  })
})

describe("organization state machine", () => {
  it("should allow active -> suspended -> active cycle", () => {
    const s1 = assertTransition(ORG_TRANSITIONS, "active", "suspend")
    expect(s1).toBe("suspended")
    const s2 = assertTransition(ORG_TRANSITIONS, "suspended", "activate")
    expect(s2).toBe("active")
  })

  it("should allow active -> banned -> active cycle", () => {
    const s1 = assertTransition(ORG_TRANSITIONS, "active", "ban")
    expect(s1).toBe("banned")
    const s2 = assertTransition(ORG_TRANSITIONS, "banned", "activate")
    expect(s2).toBe("active")
  })

  it("should not allow suspended -> banned -> suspended", () => {
    const s1 = assertTransition(ORG_TRANSITIONS, "suspended", "ban")
    expect(s1).toBe("banned")
    // banned 没有 suspend 转换
    expect(canTransition(ORG_TRANSITIONS, "banned", "suspend")).toBe(false)
  })
})
