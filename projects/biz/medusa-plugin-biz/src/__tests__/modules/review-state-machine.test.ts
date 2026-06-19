/**
 * ReviewService 评论状态机测试
 * 覆盖合法转换和非法转换
 */

import { assertTransition, canTransition } from "../../lib/state-machine";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";

// 评论状态机（与 bizReview/service.ts 保持一致）
const REVIEW_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { approve: "published", hide: "hidden" },
  published: { hide: "hidden" },
  hidden: { unhide: "published" },
  // deleted 为终态，通过直接设置 status 到达
};

describe("Review State Machine", () => {
  describe("pending state", () => {
    it("should allow pending -> published (approve)", () => {
      expect(assertTransition(REVIEW_TRANSITIONS, "pending", "approve")).toBe("published");
    });

    it("should allow pending -> hidden (hide)", () => {
      expect(assertTransition(REVIEW_TRANSITIONS, "pending", "hide")).toBe("hidden");
    });

    it("should reject pending -> unhide", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "pending", "unhide");
      }).toThrow(BizError);
    });

    it("should reject pending -> deleted (must use direct set, not state machine)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "pending", "delete");
      }).toThrow(BizError);
    });
  });

  describe("published state", () => {
    it("should allow published -> hidden (hide)", () => {
      expect(assertTransition(REVIEW_TRANSITIONS, "published", "hide")).toBe("hidden");
    });

    it("should reject published -> approve (already published)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "published", "approve");
      }).toThrow(BizError);
    });

    it("should reject published -> unhide (not hidden)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "published", "unhide");
      }).toThrow(BizError);
    });
  });

  describe("hidden state", () => {
    it("should allow hidden -> published (unhide)", () => {
      expect(assertTransition(REVIEW_TRANSITIONS, "hidden", "unhide")).toBe("published");
    });

    it("should reject hidden -> approve", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "hidden", "approve");
      }).toThrow(BizError);
    });

    it("should reject hidden -> hide (already hidden)", () => {
      expect(() => {
        assertTransition(REVIEW_TRANSITIONS, "hidden", "hide");
      }).toThrow(BizError);
    });
  });

  describe("canTransition checks", () => {
    it("should return true for valid transitions", () => {
      expect(canTransition(REVIEW_TRANSITIONS, "pending", "approve")).toBe(true);
      expect(canTransition(REVIEW_TRANSITIONS, "pending", "hide")).toBe(true);
      expect(canTransition(REVIEW_TRANSITIONS, "published", "hide")).toBe(true);
      expect(canTransition(REVIEW_TRANSITIONS, "hidden", "unhide")).toBe(true);
    });

    it("should return false for invalid transitions", () => {
      expect(canTransition(REVIEW_TRANSITIONS, "pending", "unhide")).toBe(false);
      expect(canTransition(REVIEW_TRANSITIONS, "published", "approve")).toBe(false);
      expect(canTransition(REVIEW_TRANSITIONS, "hidden", "hide")).toBe(false);
    });
  });

  describe("full moderation flow", () => {
    it("should complete pending -> published -> hidden -> published", () => {
      let status = "pending";
      status = assertTransition(REVIEW_TRANSITIONS, status, "approve");
      expect(status).toBe("published");
      status = assertTransition(REVIEW_TRANSITIONS, status, "hide");
      expect(status).toBe("hidden");
      status = assertTransition(REVIEW_TRANSITIONS, status, "unhide");
      expect(status).toBe("published");
    });

    it("should complete pending -> hidden -> published", () => {
      let status = "pending";
      status = assertTransition(REVIEW_TRANSITIONS, status, "hide");
      expect(status).toBe("hidden");
      status = assertTransition(REVIEW_TRANSITIONS, status, "unhide");
      expect(status).toBe("published");
    });
  });
});
