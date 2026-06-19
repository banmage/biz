import { OrganizationService } from "../modules/bizOrganization/service"

describe("OrganizationService", () => {
  let service: OrganizationService
  let mockManager: any
  let mockRepo: any

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn(),
    }

    mockManager = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
      transaction: jest.fn(),
    }

    const mockContainer = {
      resolve: jest.fn().mockReturnValue(mockManager),
    }

    service = new OrganizationService(mockContainer)
  })

  describe("submitApplication", () => {
    it("should throw BIZ_APPLICATION_ALREADY_EXISTS when pending application exists", async () => {
      mockRepo.findOne.mockResolvedValue({ id: "app_1", status: "pending" })

      await expect(
        service.submitApplication(
          {
            applicantId: "cus_1",
            name: "Test Org",
            type: "企业",
            contactName: "张三",
            contactPhone: "13800138000",
          },
          { type: "customer", id: "cus_1" }
        )
      ).rejects.toThrow("您已有进行中的入驻申请")
    })

    it("should throw BIZ_VALIDATION_ERROR for invalid phone", async () => {
      mockRepo.findOne.mockResolvedValue(null)

      await expect(
        service.submitApplication(
          {
            applicantId: "cus_1",
            name: "Test Org",
            type: "企业",
            contactName: "张三",
            contactPhone: "invalid",
          },
          { type: "customer", id: "cus_1" }
        )
      ).rejects.toThrow("手机号格式不正确")
    })

    it("should create application successfully", async () => {
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue({ id: "app_new", status: "pending" })

      const result = await service.submitApplication(
        {
          applicantId: "cus_1",
          name: "Test Org",
          type: "企业",
          contactName: "张三",
          contactPhone: "13800138000",
        },
        { type: "customer", id: "cus_1" }
      )

      expect(result.success).toBe(true)
      expect(mockRepo.create).toHaveBeenCalled()
      expect(mockRepo.persistAndFlush).toHaveBeenCalled()
    })
  })

  describe("reviewApplication", () => {
    it("should approve application and create organization", async () => {
      const mockApp = {
        id: "app_1",
        status: "pending",
        name: "Test Org",
        type: "企业",
        main_business_area: null,
        contact_name: "张三",
        contact_phone: "13800138000",
        contact_email: null,
        license_file_id: null,
      }

      mockRepo.findOne.mockResolvedValue(mockApp)
      mockRepo.create.mockReturnValue({ id: "org_new" })

      const result = await service.reviewApplication(
        "app_1",
        "approve",
        "usr_admin_1"
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe("approved")
    })

    it("should reject application with reason", async () => {
      const mockApp = { id: "app_1", status: "pending" }
      mockRepo.findOne.mockResolvedValue(mockApp)

      const result = await service.reviewApplication(
        "app_1",
        "reject",
        "usr_admin_1",
        "资质不全"
      )

      expect(result.success).toBe(true)
      expect(result.data.status).toBe("rejected")
    })

    it("should reject without reason", async () => {
      const mockApp = { id: "app_1", status: "pending" }
      mockRepo.findOne.mockResolvedValue(mockApp)

      await expect(
        service.reviewApplication("app_1", "reject", "usr_admin_1", "")
      ).rejects.toThrow("驳回时必须填写驳回原因")
    })
  })

  describe("updateOrganizationStatus", () => {
    it("should allow super_admin to suspend organization", async () => {
      const mockOrg = { id: "org_1", status: "active" }
      mockRepo.findOne.mockResolvedValue(mockOrg)

      const result = await service.updateOrganizationStatus(
        "org_1",
        "suspend",
        "super_admin"
      )

      expect(result.data.status).toBe("suspended")
    })

    it("should reject non-admin users", async () => {
      await expect(
        service.updateOrganizationStatus("org_1", "suspend", "member")
      ).rejects.toThrow("仅平台管理员")
    })
  })
})
