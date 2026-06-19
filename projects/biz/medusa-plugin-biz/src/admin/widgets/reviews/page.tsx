import { useState, useEffect, useCallback } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

type ReviewStatus = "pending" | "published" | "hidden" | "deleted"

interface Review {
  id: string
  product_id: string
  customer_id: string
  content: string
  overall_score: number
  status: ReviewStatus
  created_at: string
}

interface FetchResult {
  data: Review[]
  count: number
}

const StatusBadge = ({ status }: { status: ReviewStatus }) => {
  const styles: Record<ReviewStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    hidden: "bg-gray-100 text-gray-800",
    deleted: "bg-red-100 text-red-800",
  }

  const labels: Record<ReviewStatus, string> = {
    pending: "待审核",
    published: "已发布",
    hidden: "已隐藏",
    deleted: "已删除",
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

const ActionButtons = ({
  status,
  onAction,
}: {
  status: ReviewStatus
  onAction: (action: string) => void
}) => {
  const buttons: { action: string; label: string; className: string }[] = []

  if (status === "pending") {
    buttons.push({
      action: "approve",
      label: "通过",
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    })
    buttons.push({
      action: "hide",
      label: "隐藏",
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    })
  } else if (status === "published") {
    buttons.push({
      action: "hide",
      label: "隐藏",
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    })
  } else if (status === "hidden") {
    buttons.push({
      action: "unhide",
      label: "取消隐藏",
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    })
  }

  if (status !== "deleted") {
    buttons.push({
      action: "delete",
      label: "删除",
      className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {buttons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => onAction(btn.action)}
          className={`px-3 py-1 text-xs font-medium border rounded-md transition-colors ${btn.className}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-sm text-gray-500">加载中...</span>
  </div>
)

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <svg
      className="h-12 w-12 text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
    <p className="mt-2 text-sm text-gray-500">暂无评论数据</p>
  </div>
)

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) => (
  <div className="flex flex-col items-center justify-center py-12">
    <svg
      className="h-12 w-12 text-red-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
    <p className="mt-2 text-sm text-red-600">{message}</p>
    <button
      onClick={onRetry}
      className="mt-3 px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
    >
      重试
    </button>
  </div>
)

const fetchReviews = async (): Promise<FetchResult> => {
  const res = await fetch("/admin/biz/reviews?limit=20&offset=0", {
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`)
  }

  const json = await res.json()
  return json
}

const moderateReview = async (id: string, action: string): Promise<void> => {
  const res = await fetch(`/admin/biz/reviews/${id}/moderate`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  })

  if (!res.ok) {
    throw new Error(`操作失败 (${res.status})`)
  }
}

const truncate = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "..."
}

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateStr
  }
}

const renderStars = (score: number): string => {
  return "★".repeat(score) + "☆".repeat(5 - score)
}

export const ReviewsWidget = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReviews()
      setReviews(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id)
    try {
      await moderateReview(id, action)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">评论管理</h3>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error && reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">评论管理</h3>
        </div>
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">评论管理</h3>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          刷新
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  产品ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  客户ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容摘要
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {review.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {review.product_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {review.customer_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                    <span title={review.content}>
                      {truncate(review.content, 50)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-yellow-500" title={`${review.overall_score}/5`}>
                      {renderStars(review.overall_score)}
                    </span>
                    <span className="ml-1 text-gray-500 text-xs">
                      {review.overall_score}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={review.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {actionLoading === review.id ? (
                      <span className="text-xs text-gray-400">处理中...</span>
                    ) : (
                      <ActionButtons
                        status={review.status}
                        onAction={(action) =>
                          handleAction(review.id, action)
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ReviewsWidget
