/**
 * OrgMemberService 成员状态机测试
 * 覆盖合法转换和非法转换
 */

import { assertTransition, canTransition } from "../../lib/state-machine";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";

// 成员状态机（与 bizOrgMember/service.ts 保持一致）
const MEMBER_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { accept: "active", decline: "removed" },
  active: { remove: "removed", leave: "left" },
  // removed/left 为终态
};

describe("OrgMember State Machine", () => {
  describe("pending state", () => {
    it("should allow pending -> active (accept)", () => {
      expect(assertTransition(MEMBER_TRANSITIONS, "pending", "accept")).toBe("active");
    });

    it("should allow pending -> removed (decline)", () => {
      expect(assertTransition(MEMBER_TRANSITIONS, "pending", "decline")).toBe("removed");
    });

    it("should reject pending -> remove", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "pending", "remove");
      }).toThrow(BizError);
    });

    it("should reject pending -> leave", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "pending", "leave");
      }).toThrow(BizError);
    });
  });

  describe("active state", () => {
    it("should allow active -> removed (remove)", () => {
      expect(assertTransition(MEMBER_TRANSITIONS, "active", "remove")).toBe("removed");
    });

    it("should allow active -> left (leave)", () => {
      expect(assertTransition(MEMBER_TRANSITIONS, "active", "leave")).toBe("left");
    });

    it("should reject active -> accept (already active)", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "active", "accept");
      }).toThrow(BizError);
    });

    it("should reject active -> decline", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "active", "decline");
      }).toThrow(BizError);
    });
  });

  describe("terminal states (removed/left)", () => {
    it("should reject removed -> any", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "removed", "accept");
      }).toThrow(BizError);
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "removed", "remove");
      }).toThrow(BizError);
    });

    it("should reject left -> any", () => {
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "left", "accept");
      }).toThrow(BizError);
      expect(() => {
        assertTransition(MEMBER_TRANSITIONS, "left", "leave");
      }).toThrow(BizError);
    });
  });

  describe("canTransition checks", () => {
    it("should return true for valid transitions", () => {
      expect(canTransition(MEMBER_TRANSITIONS, "pending", "accept")).toBe(true);
      expect(canTransition(MEMBER_TRANSITIONS, "pending", "decline")).toBe(true);
      expect(canTransition(MEMBER_TRANSITIONS, "active", "remove")).toBe(true);
      expect(canTransition(MEMBER_TRANSITIONS, "active", "leave")).toBe(true);
    });

    it("should return false for invalid transitions", () => {
      expect(canTransition(MEMBER_TRANSITIONS, "pending", "remove")).toBe(false);
      expect(canTransition(MEMBER_TRANSITIONS, "active", "accept")).toBe(false);
      expect(canTransition(MEMBER_TRANSITIONS, "removed", "accept")).toBe(false);
      expect(canTransition(MEMBER_TRANSITIONS, "left", "leave")).toBe(false);
    });
  });

  describe("full member flow", () => {
    it("should complete pending -> active -> removed", () => {
      let status = "pending";
      status = assertTransition(MEMBER_TRANSITIONS, status, "accept");
      expect(status).toBe("active");
      status = assertTransition(MEMBER_TRANSITIONS, status, "remove");
      expect(status).toBe("removed");
    });

    it("should complete pending -> active -> left", () => {
      let status = "pending";
      status = assertTransition(MEMBER_TRANSITIONS, status, "accept");
      expect(status).toBe("active");
      status = assertTransition(MEMBER_TRANSITIONS, status, "leave");
      expect(status).toBe("left");
    });

    it("should complete pending -> removed (decline)", () => {
      let status = "pending";
      status = assertTransition(MEMBER_TRANSITIONS, status, "decline");
      expect(status).toBe("removed");
    });
  });
});
