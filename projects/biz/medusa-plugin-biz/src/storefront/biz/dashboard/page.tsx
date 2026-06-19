"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /biz/dashboard — 机构总览仪表盘
 *
 * 展示：机构信息、成员统计、产品统计、最近通知
 * 权限：任何 active 机构成员
 */
export default function DashboardPage() {
  const router = useRouter()
  const [org, setOrg] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // 获取机构信息
        const meRes = await fetch("/store/biz/org-members/me", {
          credentials: "include",
        })
        if (!meRes.ok) {
          if (meRes.status === 403 || meRes.status === 404) {
            router.replace("/biz/apply")
            return
          }
          throw new Error("获取机构信息失败")
        }
        const meData = await meRes.json()
        setOrg(meData.data || meData)

        // 获取最近通知
        const notifRes = await fetch("/store/biz/notifications?limit=5", {
          credentials: "include",
        })
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setNotifications(notifData.data?.rows || [])
        }
      } catch (e: any) {
        setError(e.message || "加载失败")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

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
        <p className="text-red-700 mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">机构总览</h1>

      {/* 机构信息 Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">机构信息</h2>
        {org && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">机构名称：</span>
              <span className="font-medium">{org.name || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">类型：</span>
              <span className="font-medium">{org.type || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">状态：</span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  org.status === "active"
                    ? "bg-green-100 text-green-700"
                    : org.status === "suspended"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {org.status === "active" ? "正常" : org.status === "suspended" ? "已暂停" : "已封禁"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">主营业务：</span>
              <span className="font-medium">{org.main_business_area || "—"}</span>
            </div>
          </div>
        )}
      </div>

      {/* 成员统计 Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">成员统计</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-700">{org?.memberCount ?? "—"}</div>
            <div className="text-sm text-gray-500 mt-1">总成员</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-700">{org?.creatorCount ?? "—"}</div>
            <div className="text-sm text-gray-500 mt-1">创建人</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700">{org?.approverCount ?? "—"}</div>
            <div className="text-sm text-gray-500 mt-1">审批员</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-700">{org?.maintainerCount ?? "—"}</div>
            <div className="text-sm text-gray-500 mt-1">维护员</div>
          </div>
        </div>
      </div>

      {/* 最近通知 Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">最近通知</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无通知</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  n.is_read ? "bg-gray-50" : "bg-blue-50 border-l-4 border-blue-400"
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{n.content}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString("zh-CN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
