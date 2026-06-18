import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizOrgMember } from "./models/org-member";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { assertTransition, TransitionMap } from "../../lib/state-machine";
import { successResponse, errorResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";
import { Actor } from "../../types";

// 成员状态机
const MEMBER_TRANSITIONS: TransitionMap = {
  pending: { accept: "active", decline: "removed" },
  active: { remove: "removed", leave: "left" },
  // removed/left 为终态，重新邀请时重置为 pending
};

class OrgMemberService extends MedusaService({
  OrgMember: BizOrgMember,
}) {
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 邀请成员
   * 若已存在 removed/left 记录，重置为 pending（不创建新记录）
   */
  async inviteMember(
    organizationId: string,
    customerId: string,
    role: "approver" | "maintainer" | "member",
    invitedBy: string
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);

    // 检查是否已有记录（包括已移除/离开的）
    const existing = await repo.findOne({
      where: { organization_id: organizationId, customer_id: customerId },
    });

    if (existing) {
      if (existing.status === "active" || existing.status === "pending") {
        throw new BizError(
          BizErrorCode.BIZ_ORG_MEMBER_ALREADY_EXISTS,
          "该成员已存在于机构中"
        );
      }
      // removed/left → 重置为 pending
      existing.status = "pending";
      existing.role = role;
      existing.invited_by = invitedBy;
      existing.invited_at = new Date();
      existing.joined_at = null;
      await repo.persistAndFlush(existing);

      return successResponse(
        { memberId: existing.id, status: "pending" },
        "邀请已发送"
      );
    }

    const member = repo.create({
      organization_id: organizationId,
      customer_id: customerId,
      role,
      status: "pending",
      invited_by: invitedBy,
      invited_at: new Date(),
    });

    await repo.persistAndFlush(member);

    return successResponse(
      { memberId: member.id, status: "pending" },
      "邀请已发送"
    );
  }

  /**
   * 响应邀请（接受/拒绝）
   */
  async respondInvitation(
    memberId: string,
    customerId: string,
    action: "accept" | "decline"
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);

    const member = await repo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "邀请记录不存在");
    }

    if (member.customer_id !== customerId) {
      throw new BizError(BizErrorCode.BIZ_FORBIDDEN, "无权操作此邀请");
    }

    const newStatus = assertTransition(MEMBER_TRANSITIONS, member.status, action);

    if (action === "accept") {
      member.status = newStatus;
      member.joined_at = new Date();
    } else {
      member.status = newStatus;
    }

    await repo.persistAndFlush(member);

    return successResponse(
      { memberId: member.id, status: member.status },
      action === "accept" ? "已接受邀请" : "已拒绝邀请"
    );
  }

  /**
   * 移除成员（仅 creator 可操作）
   * R2 约束：creator 不可被移除
   */
  async removeMember(
    memberId: string,
    actorId: string,
    actorIsCreator: boolean
  ) {
    if (!actorIsCreator) {
      throw new BizError(
        BizErrorCode.BIZ_ORG_ROLE_NO_PERMISSION,
        "仅机构创建人可移除成员"
      );
    }

    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);

    const member = await repo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "成员不存在");
    }

    if (member.role === "creator") {
      throw new BizError(
        BizErrorCode.BIZ_ORG_CREATOR_CANNOT_BE_REMOVED,
        "不可移除机构创建人"
      );
    }

    const newStatus = assertTransition(MEMBER_TRANSITIONS, member.status, "remove");
    member.status = newStatus;
    await repo.persistAndFlush(member);

    return successResponse(
      { memberId: member.id, status: member.status },
      "成员已移除"
    );
  }

  /**
   * 退出机构
   * R2 约束：creator 不可退出
   */
  async leaveOrganization(memberId: string, actorId: string, isCreator: boolean) {
    if (isCreator) {
      throw new BizError(
        BizErrorCode.BIZ_ORG_CREATOR_CANNOT_LEAVE,
        "机构创建人不可退出机构"
      );
    }

    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);

    const member = await repo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "成员不存在");
    }

    if (member.customer_id !== actorId) {
      throw new BizError(BizErrorCode.BIZ_FORBIDDEN, "无权操作");
    }

    const newStatus = assertTransition(MEMBER_TRANSITIONS, member.status, "leave");
    member.status = newStatus;
    await repo.persistAndFlush(member);

    return successResponse(
      { memberId: member.id, status: member.status },
      "已退出机构"
    );
  }

  /**
   * 获取成员列表（分页）
   */
  async listMembers(organizationId: string, query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);
    const { limit, offset } = parsePagination(query);

    const [rows, total] = await repo.findAndCount(
      { organization_id: organizationId },
      {
        limit,
        offset,
        orderBy: { created_at: "DESC" },
      }
    );

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  /**
   * 获取当前用户的机构成员信息
   */
  async getMemberByCustomerId(customerId: string) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrgMember);

    const member = await repo.findOne({
      where: { customer_id: customerId, status: "active" },
    });

    if (!member) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "未找到机构成员记录");
    }

    return successResponse(member, "查询成功");
  }
}

export default OrgMemberService;
