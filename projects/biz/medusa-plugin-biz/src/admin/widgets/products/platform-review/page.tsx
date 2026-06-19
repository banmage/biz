import { useState, useEffect, useCallback } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

export const config = defineWidgetConfig({
  zone: "product.list.after",
})

interface Product {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  // extend as needed
}

interface PlatformScores {
  innovation: number | ""
  complexity: number | ""
  novelty: number | ""
}

/**
 * 平台终审台 Widget
 *
 * 功能：
 * - 展示待终审产品列表（status=platform_pending，分页）
 * - 点击产品行 → 展开详情面板
 * - 填写 3 个平台评分（innovation / complexity / novelty，1-5）
 * - 点击"通过" → POST /admin/biz/products/:id/platform-review { action: "approve", scores }
 * - 点击"驳回" → 填写驳回原因 → POST .../platform-review { action: "reject", reject_reason }
 *
 * API：
 * - GET /admin/biz/products?status=platform_pending&limit=20&offset=0
 * - POST /admin/biz/products/:id/platform-review
 */
export default function ProductPlatformReviewWidget() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [scores, setScores] = useState<PlatformScores>({
    innovation: "",
    complexity: "",
    novelty: "",
  })
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        "/admin/biz/products?status=platform_pending&limit=20&offset=0",
        { credentials: "include" }
      )
      if (!res.ok) {
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      setProducts(data.products ?? data ?? [])
    } catch (err: any) {
      setError(err.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleRowClick = (product: Product) => {
    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)
    setScores({ innovation: "", complexity: "", novelty: "" })
    setRejectReason("")
  }

  const handleScoreChange = (field: keyof PlatformScores, value: string) => {
    const num = value === "" ? "" : Math.min(5, Math.max(1, parseInt(value, 10) || 1))
    setScores((prev) => ({ ...prev, [field]: num }))
  }

  const scoresValid =
    scores.innovation !== "" &&
    scores.complexity !== "" &&
    scores.novelty !== ""

  const handleApprove = async () => {
    if (!scoresValid || !expandedId) return
    setActionLoading(true)
    try {
      const res = await fetch(
        `/admin/biz/products/${expandedId}/platform-review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            scores: {
              innovation: scores.innovation,
              complexity: scores.complexity,
              novelty: scores.novelty,
            },
          }),
        }
      )
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status}`)
      }
      setExpandedId(null)
      await fetchProducts()
    } catch (err: any) {
      alert(err.message || "操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim() || !expandedId) return
    setActionLoading(true)
    try {
      const res = await fetch(
        `/admin/biz/products/${expandedId}/platform-review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            reject_reason: rejectReason.trim(),
          }),
        }
      )
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status}`)
      }
      setShowRejectModal(false)
      setExpandedId(null)
      setRejectReason("")
      await fetchProducts()
    } catch (err: any) {
      alert(err.message || "操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-500">
        <svg
          className="animate-spin h-5 w-5 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">加载失败</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={fetchProducts}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
        >
          重试
        </button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <svg
          className="mx-auto h-12 w-12 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p>暂无待终审产品</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">平台终审台</h2>

      {/* 产品列表表格 */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">产品名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">描述</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">提交时间</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <>
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => handleRowClick(product)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{product.title}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {product.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      待终审
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(product.created_at).toLocaleDateString("zh-CN")}
                  </td>
                </tr>

                {/* 展开详情面板 */}
                {expandedId === product.id && (
                  <tr key={`${product.id}-detail`}>
                    <td colSpan={4} className="bg-gray-50 px-6 py-5">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700">平台评分</h3>

                        {/* 评分输入 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {(["innovation", "complexity", "novelty"] as const).map(
                            (field) => (
                              <div key={field}>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                  {field === "innovation"
                                    ? "创新性"
                                    : field === "complexity"
                                    ? "复杂度"
                                    : "新颖性"}{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={scores[field]}
                                  onChange={(e) => handleScoreChange(field, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">选择评分</option>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove()
                            }}
                            disabled={!scoresValid || actionLoading}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          >
                            {actionLoading ? "处理中..." : "通过"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowRejectModal(true)
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          >
                            驳回
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 驳回原因弹窗 */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-3">填写驳回原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {actionLoading ? "提交中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
