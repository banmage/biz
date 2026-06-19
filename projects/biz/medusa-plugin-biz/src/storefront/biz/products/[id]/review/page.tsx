"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * /biz/products/:id/review — 机构内审操作页
 * 权限：approver
 */
export default function ProductReviewPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [extension, setExtension] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [scores, setScores] = useState({ innovation: "", complexity: "", novelty: "" })
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    const fetchExtension = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/store/biz/products/${productId}/extension`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error("获取产品扩展信息失败")
        const data = await res.json()
        setExtension(data.data || data)
      } catch (e: any) {
        setError(e.message || "加载失败")
      } finally {
        setLoading(false)
      }
    }
    if (productId) fetchExtension()
  }, [productId])

  const handleApprove = async () => {
    if (!scores.innovation || !scores.complexity || !scores.novelty) {
      alert("请填写全部3个评分")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/biz/products/${productId}/org-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "approve",
          scores: {
            innovation: Number(scores.innovation),
            complexity: Number(scores.complexity),
            novelty: Number(scores.novelty),
          },
        }),
      })
      if (res.ok) {
        alert("内审通过！")
        router.push("/biz/products")
      } else {
        const data = await res.json()
        alert(data.error?.message || "操作失败")
      }
    } catch {
      alert("操作完成")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("请填写驳回原因")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/biz/products/${productId}/org-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reject", reject_reason: rejectReason }),
      })
      if (res.ok) {
        alert("已驳回")
        router.push("/biz/products")
      } else {
        const data = await res.json()
        alert(data.error?.message || "操作失败")
      }
    } catch {
      alert("操作完成")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }

  if (error || !extension) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error || "产品扩展信息不存在"}</p>
        <button onClick={() => router.push("/biz/products")} className="mt-3 px-4 py-2 bg-gray-600 text-white rounded">返回</button>
      </div>
    )
  }

  if (extension.review_status !== "org_pending") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-700">此产品当前状态为「{extension.review_status}」，不需要机构内审</p>
        <button onClick={() => router.push("/biz/products")} className="mt-3 px-4 py-2 bg-gray-600 text-white rounded">返回</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => router.push("/biz/products")} className="text-blue-600 hover:text-blue-800 text-sm mb-4 flex items-center gap-1">
        ← 返回产品列表
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">机构内审</h1>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">产品信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">产品ID：</span><span className="font-mono">{extension.product_id}</span></div>
          <div><span className="text-gray-500">状态：</span><span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">待机构审核</span></div>
        </div>
      </div>

      {/* 评分表单 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">机构评分（1-5分）</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">创新性</label>
            <select
              value={scores.innovation}
              onChange={(e) => setScores({ ...scores, innovation: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">选择</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} 分</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">复杂度</label>
            <select
              value={scores.complexity}
              onChange={(e) => setScores({ ...scores, complexity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">选择</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} 分</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新颖度</label>
            <select
              value={scores.novelty}
              onChange={(e) => setScores({ ...scores, novelty: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">选择</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} 分</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {submitting ? "提交中..." : "通过"}
        </button>
        <button
          onClick={() => setShowRejectForm(true)}
          disabled={submitting}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
        >
          驳回
        </button>
      </div>

      {/* 驳回原因弹窗 */}
      {showRejectForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">填写驳回原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写驳回原因..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {submitting ? "提交中..." : "确认驳回"}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason("") }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
