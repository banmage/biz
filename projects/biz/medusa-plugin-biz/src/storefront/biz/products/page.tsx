"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /biz/products — 产品列表页（展示本机构产品）
 * 权限：任何 active 机构成员
 *
 * 注意：当前版本展示产品扩展列表
 * 实际产品信息（title, description 等）需要从核心 Product API 获取，
 * MVP 版本仅展示扩展信息
 */
export default function BizProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const meRes = await fetch("/store/biz/org-members/me", { credentials: "include" })
      if (!meRes.ok) {
        if (meRes.status === 403 || meRes.status === 404) {
          router.replace("/biz/apply")
          return
        }
        throw new Error("获取机构信息失败")
      }

      // 获取产品扩展列表（待审核的）
      const params = new URLSearchParams({ limit: "50", offset: "0" })
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/store/biz/products?${params}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data?.rows || data.data || [])
      } else {
        throw new Error("获取产品列表失败")
      }
    } catch (e: any) {
      setError(e.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [statusFilter])

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "草稿", className: "bg-gray-100 text-gray-700" },
      org_pending: { label: "待机构审核", className: "bg-yellow-100 text-yellow-700" },
      platform_pending: { label: "待平台审核", className: "bg-blue-100 text-blue-700" },
      published: { label: "已发布", className: "bg-green-100 text-green-700" },
    }
    const s = map[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <span className={`px-2 py-1 rounded text-xs font-medium ${s.className}`}>{s.label}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded">重试</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="org_pending">待机构审核</option>
            <option value="platform_pending">待平台审核</option>
            <option value="published">已发布</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500">暂无产品数据</p>
          <button
            onClick={() => {}}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            发布新产品
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">产品ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">机构</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">机构评分</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">平台评分</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.product_id?.substring(0, 8) || p.id?.substring(0, 8)}...</td>
                  <td className="py-3 px-4 text-gray-600">{p.organization_id?.substring(0, 8) || "—"}...</td>
                  <td className="py-3 px-4">{statusBadge(p.review_status)}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {p.organization_innovation_score
                      ? `${p.organization_innovation_score}/${p.organization_complexity_score}/${p.organization_novelty_score}`
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {p.platform_innovation_score
                      ? `${p.platform_innovation_score}/${p.platform_complexity_score}/${p.platform_novelty_score}`
                      : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => router.push(`/biz/products/${p.product_id || p.id}/extension`)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      查看详情
                    </button>
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
