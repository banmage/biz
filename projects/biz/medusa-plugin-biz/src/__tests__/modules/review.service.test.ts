import { ReviewService } from "../modules/bizReview/service"

describe("ReviewService - validation", () => {
  let service: ReviewService
  let mockManager: any
  let mockRepo: any

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      persistAndFlush: jest.fn(),
    }
    mockManager = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    }
    const mockContainer = {
      resolve: jest.fn().mockReturnValue(mockManager),
    }
    service = new ReviewService(mockContainer)
  })

  it("should reject review with content shorter than 10 chars", async () => {
    await expect(
      service.createReview("prod_1", "cus_1", "short", {
        overall: 4, innovation: 5, complexity: 3, novelty: 4,
      })
    ).rejects.toThrow("评论内容不能少于10个字符")
  })

  it("should reject review with score below 1", async () => {
    await expect(
      service.createReview("prod_1", "cus_1", "这是一条足够长的评论内容", {
        overall: 0, innovation: 5, complexity: 3, novelty: 4,
      })
    ).rejects.toThrow("overall 评分必须是1-5的整数")
  })

  it("should reject review with score above 5", async () => {
    await expect(
      service.createReview("prod_1", "cus_1", "这是一条足够长的评论内容", {
        overall: 4, innovation: 6, complexity: 3, novelty: 4,
      })
    ).rejects.toThrow("innovation 评分必须是1-5的整数")
  })

  it("should reject review with content longer than 5000 chars", async () => {
    const longContent = "a".repeat(5001)
    await expect(
      service.createReview("prod_1", "cus_1", longContent, {
        overall: 4, innovation: 5, complexity: 3, novelty: 4,
      })
    ).rejects.toThrow("评论内容不能超过5000个字符")
  })

  it("should create review with valid data", async () => {
    mockRepo.create.mockReturnValue({ id: "rev_new", status: "pending" })

    const result = await service.createReview(
      "prod_1", "cus_1", "这是一条足够长的评论内容",
      { overall: 4, innovation: 5, complexity: 3, novelty: 4 }
    )

    expect(result.success).toBe(true)
    expect(mockRepo.create).toHaveBeenCalled()
    expect(mockRepo.persistAndFlush).toHaveBeenCalled()
  })

  it("should accept exactly 10 char content (boundary)", async () => {
    mockRepo.create.mockReturnValue({ id: "rev_boundary", status: "pending" })

    const result = await service.createReview(
      "prod_1", "cus_1", "0123456789",
      { overall: 3, innovation: 3, complexity: 3, novelty: 3 }
    )

    expect(result.success).toBe(true)
  })
})
