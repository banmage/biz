/**
 * ProductExtensionService 单元测试
 * 
 * 注意：这些测试验证 Service 层的业务逻辑。
 * 由于 Service 依赖 Medusa 容器（container.resolve），
 * 这里使用简化的 mock 测试核心逻辑。
 */

import { assertTransition } from "../../lib/state-machine"
import { BizError, BizErrorCode } from "../../lib/biz-error-codes"

// 产品审核状态机（与 service.ts 保持一致）
const REVIEW_TRANSITIONS: Record<string, Record<string, string>> = {
  draft: { submit_org_review: "org_pending" },
  org_pending: { org_approve: "platform_pending", org_reject: "draft" },
  platform_pending: { platform_approve: "published", platform_reject: "draft" },
}

describe("ProductExtensionService - State Machine", () => {
  describe("submitForReview", () => {
    it("should allow draft -> org_pending", () => {
      const result = assertTransition(REVIEW_TRANSITIONS, "draft", "submit_org_review")
      expect(result).toBe("org_pending")
    })

    it("should reject draft -> published (skip steps)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "draft", "platform_approve")
      }).toThrow(BizError)
    })

    it("should reject draft -> org_reject (wrong direction)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "draft", "org_reject")
      }).toThrow(BizError)
    })
  })

  describe("orgReview", () => {
    it("should allow org_pending -> platform_pending (approve)", () => {
      const result = assertTransition(REVIEW_TRANSITIONS, "org_pending", "org_approve")
      expect(result).toBe("platform_pending")
    })

    it("should allow org_pending -> draft (reject)", () => {
      const result = assertTransition(REVIEW_TRANSITIONS, "org_pending", "org_reject")
      expect(result).toBe("draft")
    })

    it("should reject org_pending -> published (skip platform)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "org_pending", "platform_approve")
      }).toThrow(BizError)
    })
  })

  describe("platformReview", () => {
    it("should allow platform_pending -> published (approve)", () => {
      const result = assertTransition(REVIEW_TRANSITIONS, "platform_pending", "platform_approve")
      expect(result).toBe("published")
    })

    it("should allow platform_pending -> draft (reject)", () => {
      const result = assertTransition(REVIEW_TRANSITIONS, "platform_pending", "platform_reject")
      expect(result).toBe("draft")
    })

    it("should reject published -> any (terminal state)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "published", "platform_approve")
      }).toThrow(BizError)
    })
  })

  describe("full review flow", () => {
    it("should complete draft -> org_pending -> platform_pending -> published", () => {
      let status = "draft"
      status = assertTransition(REVIEW_TRANSITIONS, status, "submit_org_review")
      expect(status).toBe("org_pending")
      status = assertTransition(REVIEW_TRANSITIONS, status, "org_approve")
      expect(status).toBe("platform_pending")
      status = assertTransition(REVIEW_TRANSITIONS, status, "platform_approve")
      expect(status).toBe("published")
    })

    it("should complete rejected flow: draft -> org_pending -> draft -> org_pending -> platform_pending -> published", () => {
      let status = "draft"
      status = assertTransition(REVIEW_TRANSITIONS, status, "submit_org_review")
      expect(status).toBe("org_pending")
      status = assertTransition(REVIEW_TRANSITIONS, status, "org_reject")
      expect(status).toBe("draft")
      status = assertTransition(REVIEW_TRANSITIONS, status, "submit_org_review")
      expect(status).toBe("org_pending")
      status = assertTransition(REVIEW_TRANSITIONS, status, "org_approve")
      expect(status).toBe("platform_pending")
      status = assertTransition(REVIEW_TRANSITIONS, status, "platform_approve")
      expect(status).toBe("published")
    })
  })
})

describe("Score Validation", () => {
  const validateScores = (scores: { innovation?: number; complexity?: number; novelty?: number }) => {
    if (!scores?.innovation || !scores?.complexity || !scores?.novelty) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "机构内审通过时必须填写全部3个评分"
      )
    }
    for (const [key, val] of Object.entries(scores)) {
      if (!Number.isInteger(val) || (val as number) < 1 || (val as number) > 5) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          `${key} 评分必须是1-5的整数`
        )
      }
    }
  }

  it("should accept valid scores", () => {
    expect(() => validateScores({ innovation: 4, complexity: 3, novelty: 5 })).not.toThrow()
  })

  it("should reject missing innovation score", () => {
    expect(() => validateScores({ complexity: 3, novelty: 5 })).toThrow(BizError)
  })

  it("should reject missing complexity score", () => {
    expect(() => validateScores({ innovation: 4, novelty: 5 })).toThrow(BizError)
  })

  it("should reject missing novelty score", () => {
    expect(() => validateScores({ innovation: 4, complexity: 3 })).toThrow(BizError)
  })

  it("should reject score below 1", () => {
    expect(() => validateScores({ innovation: 0, complexity: 3, novelty: 5 })).toThrow(BizError)
  })

  it("should reject score above 5", () => {
    expect(() => validateScores({ innovation: 6, complexity: 3, novelty: 5 })).toThrow(BizError)
  })

  it("should reject non-integer score", () => {
    expect(() => validateScores({ innovation: 3.5, complexity: 3, novelty: 5 })).toThrow(BizError)
  })
})

describe("Tag Validation", () => {
  const validateTags = (tags?: string[]): string[] => {
    if (!tags || tags.length === 0) return []
    if (tags.length > 10) {
      throw new BizError(BizErrorCode.BIZ_VALIDATION_ERROR, "标签数量不能超过10个")
    }
    return tags.map((t) => {
      if (t.length > 20) {
        throw new BizError(BizErrorCode.BIZ_VALIDATION_ERROR, "单个标签长度不能超过20字符")
      }
      return t.toLowerCase()
    })
  }

  it("should return empty array for no tags", () => {
    expect(validateTags()).toEqual([])
    expect(validateTags([])).toEqual([])
  })

  it("should convert tags to lowercase", () => {
    expect(validateTags(["Hello", "WORLD"])).toEqual(["hello", "world"])
  })

  it("should reject more than 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`)
    expect(() => validateTags(tags)).toThrow(BizError)
  })

  it("should reject tag longer than 20 chars", () => {
    expect(() => validateTags(["this_is_a_very_long_tag_name"])).toThrow(BizError)
  })

  it("should accept valid tags", () => {
    expect(validateTags(["智能家居", "网关"])).toEqual(["智能家居", "网关"])
  })
})
