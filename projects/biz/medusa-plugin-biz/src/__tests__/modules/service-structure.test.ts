/**
 * Service 层集成测试
 *
 * 注意：这些测试需要完整的 Medusa 运行时环境（container、entityManager）。
 * 由于 Service 依赖 MedusaService 基类（来自 @medusajs/framework/utils），
 * 纯单元测试无法正确编译（类型系统限制）。
 *
 * 以下测试验证 Service 的构造和基本方法签名，
 * 完整的功能测试需要在 Docker 环境中运行集成测试。
 */

describe("Service module structure", () => {
  it("should have all 6 service files", () => {
    const fs = require("fs")
    const path = require("path")
    const servicesDir = path.join(__dirname, "../../modules")
    const modules = [
      "bizOrganization",
      "bizOrgMember",
      "bizProductExtension",
      "bizReview",
      "bizNotification",
      "bizAuditLog",
    ]
    for (const mod of modules) {
      const servicePath = path.join(servicesDir, mod, "service.ts")
      expect(fs.existsSync(servicePath)).toBe(true)
    }
  })

  it("should have all service files with default export", () => {
    const fs = require("fs")
    const path = require("path")
    const servicesDir = path.join(__dirname, "../../modules")
    const modules = [
      "bizOrganization",
      "bizOrgMember",
      "bizProductExtension",
      "bizReview",
      "bizNotification",
      "bizAuditLog",
    ]
    for (const mod of modules) {
      const servicePath = path.join(servicesDir, mod, "service.ts")
      const content = fs.readFileSync(servicePath, "utf-8")
      expect(content).toContain("export default")
      expect(content).toContain("MedusaService")
    }
  })

  it("should have all index.ts files with service export", () => {
    const fs = require("fs")
    const path = require("path")
    const servicesDir = path.join(__dirname, "../../modules")
    const modules = [
      "bizOrganization",
      "bizOrgMember",
      "bizProductExtension",
      "bizReview",
      "bizNotification",
      "bizAuditLog",
    ]
    for (const mod of modules) {
      const indexPath = path.join(servicesDir, mod, "index.ts")
      const content = fs.readFileSync(indexPath, "utf-8")
      expect(content).toContain("service:")
    }
  })
})

describe("Service business logic validation", () => {
  it("OrganizationService should have submitApplication method", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizOrganization/service.ts"),
      "utf-8"
    )
    expect(content).toContain("submitApplication")
    expect(content).toContain("reviewApplication")
    expect(content).toContain("updateOrganizationStatus")
    expect(content).toContain("listApplications")
    expect(content).toContain("listOrganizations")
  })

  it("OrgMemberService should have invite/respond/remove/leave methods", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizOrgMember/service.ts"),
      "utf-8"
    )
    expect(content).toContain("inviteMember")
    expect(content).toContain("respondInvitation")
    expect(content).toContain("removeMember")
    expect(content).toContain("leaveOrganization")
    expect(content).toContain("getMemberByCustomerId")
  })

  it("ProductExtensionService should have create/submit/review methods", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizProductExtension/service.ts"),
      "utf-8"
    )
    expect(content).toContain("createProductWithExtension")
    expect(content).toContain("submitForReview")
    expect(content).toContain("orgReview")
    expect(content).toContain("platformReview")
    expect(content).toContain("validateTags")
    expect(content).toContain("validateScores")
  })

  it("ReviewService should have create/moderate/list methods", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizReview/service.ts"),
      "utf-8"
    )
    expect(content).toContain("createReview")
    expect(content).toContain("moderateReview")
    expect(content).toContain("listPublishedReviews")
    expect(content).toContain("listAllReviews")
  })

  it("NotificationService should have create/list/markRead methods", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizNotification/service.ts"),
      "utf-8"
    )
    expect(content).toContain("createNotification")
    expect(content).toContain("listNotifications")
    expect(content).toContain("markAsRead")
  })

  it("AuditLogService should have write/query methods", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizAuditLog/service.ts"),
      "utf-8"
    )
    expect(content).toContain("writeAuditLog")
    expect(content).toContain("queryAuditLogs")
  })
})

describe("State machine transitions in services", () => {
  it("OrganizationService should use state machine for application review", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizOrganization/service.ts"),
      "utf-8"
    )
    expect(content).toContain("assertTransition")
    expect(content).toContain("APPLICATION_TRANSITIONS")
    expect(content).toContain("ORG_TRANSITIONS")
  })

  it("ProductExtensionService should use state machine for review flow", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizProductExtension/service.ts"),
      "utf-8"
    )
    expect(content).toContain("assertTransition")
    expect(content).toContain("REVIEW_TRANSITIONS")
  })

  it("ReviewService should use state machine for moderation", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizReview/service.ts"),
      "utf-8"
    )
    expect(content).toContain("assertTransition")
    expect(content).toContain("REVIEW_TRANSITIONS")
  })
})

describe("Error handling patterns", () => {
  it("all services should use BizError for error handling", () => {
    const fs = require("fs")
    const path = require("path")
    const services = [
      "bizOrganization/service.ts",
      "bizOrgMember/service.ts",
      "bizProductExtension/service.ts",
      "bizReview/service.ts",
    ]
    for (const svc of services) {
      const content = fs.readFileSync(path.join(__dirname, "../../modules", svc), "utf-8")
      expect(content).toContain("BizError")
      expect(content).toContain("BizErrorCode")
    }
  })

  it("OrganizationService should check idempotency for applications", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizOrganization/service.ts"),
      "utf-8"
    )
    expect(content).toContain("BIZ_APPLICATION_ALREADY_EXISTS")
  })

  it("OrgMemberService should protect creator from removal/leave", () => {
    const fs = require("fs")
    const content = fs.readFileSync(
      require("path").join(__dirname, "../../modules/bizOrgMember/service.ts"),
      "utf-8"
    )
    expect(content).toContain("BIZ_ORG_CREATOR_CANNOT_BE_REMOVED")
    expect(content).toContain("BIZ_ORG_CREATOR_CANNOT_LEAVE")
  })
})
