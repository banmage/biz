import { MedusaService } from "@medusajs/framework/utils";
import { EntityManager } from "@mikro-orm/postgresql";
import { BizOrganization } from "./models/organization";
import { BizOrganizationApplication } from "./models/organization-application";
import { BizError, BizErrorCode } from "../../lib/biz-error-codes";
import { assertTransition, TransitionMap } from "../../lib/state-machine";
import { successResponse, errorResponse } from "../../lib/response";
import { parsePagination, paginatedResponse } from "../../lib/pagination";
import { Actor } from "../../types";

// 机构状态机
const ORG_TRANSITIONS: TransitionMap = {
  active: { suspend: "suspended", ban: "banned" },
  suspended: { activate: "active", ban: "banned" },
  banned: { activate: "active" },
};

// 申请状态机
const APPLICATION_TRANSITIONS: TransitionMap = {
  pending: { approve: "approved", reject: "rejected" },
};

class OrganizationService extends MedusaService({
  Organization: BizOrganization,
  OrganizationApplication: BizOrganizationApplication,
}) {
  protected container: any;

  constructor(container: any) {
    super(container);
    this.container = container;
  }

  /**
   * 提交入驻申请
   * 幂等规则：同一 applicant_id 存在 pending 申请时返回 409
   */
  async submitApplication(
    data: {
      applicantId: string;
      name: string;
      type: string;
      mainBusinessArea?: string;
      licenseFileId?: string;
      contactName: string;
      contactPhone: string;
      contactEmail?: string;
    },
    actor: Actor
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const applicationRepo = manager.getRepository(BizOrganizationApplication);

    // 幂等检查：同一用户是否有 pending 申请
    const existing = await applicationRepo.findOne({
      where: { applicant_id: data.applicantId, status: "pending" },
    });

    if (existing) {
      throw new BizError(
        BizErrorCode.BIZ_APPLICATION_ALREADY_EXISTS,
        "您已有进行中的入驻申请，请勿重复提交"
      );
    }

    // 校验手机号格式
    if (!/^1[3-9]\d{9}$/.test(data.contactPhone)) {
      throw new BizError(
        BizErrorCode.BIZ_VALIDATION_ERROR,
        "手机号格式不正确"
      );
    }

    const application = applicationRepo.create({
      applicant_id: data.applicantId,
      name: data.name,
      type: data.type,
      main_business_area: data.mainBusinessArea || null,
      license_file_id: data.licenseFileId || null,
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail || null,
      status: "pending",
    });

    await applicationRepo.persistAndFlush(application);

    return successResponse(
      { applicationId: application.id, status: application.status },
      "申请提交成功，请等待审核"
    );
  }

  /**
   * 审核入驻申请
   * approve: pending → approved，创建 Organization + OrgMember(creator)
   * reject: pending → rejected
   */
  async reviewApplication(
    applicationId: string,
    action: "approve" | "reject",
    reviewerUserId: string,
    rejectReason?: string
  ) {
    const manager = this.container.resolve("manager") as EntityManager;
    const applicationRepo = manager.getRepository(BizOrganizationApplication);
    const orgRepo = manager.getRepository(BizOrganization);

    const application = await applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "申请不存在");
    }

    // 状态机断言
    const newStatus = assertTransition(APPLICATION_TRANSITIONS, application.status, action);

    if (action === "approve") {
      application.status = newStatus;
      application.reviewed_by = reviewerUserId;
      application.reviewed_at = new Date();
      await applicationRepo.persistAndFlush(application);

      // 创建机构
      const organization = orgRepo.create({
        name: application.name,
        type: application.type,
        main_business_area: application.main_business_area,
        status: "active",
        contact_name: application.contact_name,
        contact_phone: application.contact_phone,
        contact_email: application.contact_email,
        license_file_id: application.license_file_id,
      });
      await orgRepo.persistAndFlush(organization);

      return successResponse(
        {
          applicationId: application.id,
          status: "approved",
          organizationId: organization.id,
        },
        "入驻申请已通过"
      );
    } else {
      // reject
      if (!rejectReason || rejectReason.trim().length === 0) {
        throw new BizError(
          BizErrorCode.BIZ_VALIDATION_ERROR,
          "驳回时必须填写驳回原因"
        );
      }
      application.status = newStatus;
      application.reject_reason = rejectReason;
      application.reviewed_by = reviewerUserId;
      application.reviewed_at = new Date();
      await applicationRepo.persistAndFlush(application);

      return successResponse(
        { applicationId: application.id, status: "rejected" },
        "申请已驳回"
      );
    }
  }

  /**
   * 变更机构状态
   */
  async updateOrganizationStatus(
    organizationId: string,
    event: string,
    actorRole: string
  ) {
    if (!["super_admin", "admin"].includes(actorRole)) {
      throw new BizError(
        BizErrorCode.BIZ_PLATFORM_ROLE_NO_PERMISSION,
        "仅平台管理员可变更机构状态"
      );
    }

    const manager = this.container.resolve("manager") as EntityManager;
    const orgRepo = manager.getRepository(BizOrganization);

    const org = await orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new BizError(BizErrorCode.BIZ_NOT_FOUND, "机构不存在");
    }

    const newStatus = assertTransition(ORG_TRANSITIONS, org.status, event);
    org.status = newStatus;
    await orgRepo.persistAndFlush(org);

    return successResponse(
      { organizationId: org.id, status: org.status },
      "机构状态已更新"
    );
  }

  /**
   * 获取入驻申请列表（分页）
   */
  async listApplications(query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrganizationApplication);
    const { limit, offset } = parsePagination(query);
    const status = query.status as string | undefined;

    const where = status ? { status } : {};
    const [rows, total] = await repo.findAndCount(where, {
      limit,
      offset,
      orderBy: { created_at: "DESC" },
    });

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }

  /**
   * 获取机构列表（分页）
   */
  async listOrganizations(query: Record<string, any>) {
    const manager = this.container.resolve("manager") as EntityManager;
    const repo = manager.getRepository(BizOrganization);
    const { limit, offset } = parsePagination(query);
    const status = query.status as string | undefined;

    const where = status ? { status } : {};
    const [rows, total] = await repo.findAndCount(where, {
      limit,
      offset,
      orderBy: { created_at: "DESC" },
    });

    return successResponse(paginatedResponse(rows, total, { limit, offset }), "查询成功");
  }
}

export default OrganizationService;
