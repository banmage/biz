"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * /biz/products/:id/extension — 产品扩展信息详情页
 * 权限：任何 active 机构成员
 */
export default function ProductExtensionPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [extension, setExtension] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <button onClick={() => router.push("/biz/products")} className="mt-3 px-4 py-2 bg-gray-600 text-white rounded">返回产品列表</button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => router.push("/biz/products")}
        className="text-blue-600 hover:text-blue-800 text-sm mb-4 flex items-center gap-1"
      >
        ← 返回产品列表
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">产品扩展详情</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">产品ID</span>
              <span className="font-mono">{extension.product_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">机构ID</span>
              <span className="font-mono">{extension.organization_id || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">审核状态</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                extension.review_status === "published" ? "bg-green-100 text-green-700" :
                extension.review_status === "platform_pending" ? "bg-blue-100 text-blue-700" :
                extension.review_status === "org_pending" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {extension.review_status === "published" ? "已发布" :
                 extension.review_status === "platform_pending" ? "待平台审核" :
                 extension.review_status === "org_pending" ? "待机构审核" : "草稿"}
              </span>
            </div>
          </div>
        </div>

        {/* 机构评分 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">机构评分</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">创新性</span>
              <span className="font-bold">{extension.organization_innovation_score ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">复杂度</span>
              <span className="font-bold">{extension.organization_complexity_score ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">新颖度</span>
              <span className="font-bold">{extension.organization_novelty_score ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* 平台评分 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">平台评分</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">创新性</span>
              <span className="font-bold">{extension.platform_innovation_score ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">复杂度</span>
              <span className="font-bold">{extension.platform_complexity_score ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">新颖度</span>
              <span className="font-bold">{extension.platform_novelty_score ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* 元数据 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">元数据</h2>
          <div className="text-sm text-gray-600">
            {extension.metadata ? (
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-40">
                {JSON.stringify(extension.metadata, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-400">无元数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
