"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /biz/notifications — 通知列表页
 * 权限：任何 active 机构成员
 */
export default function BizNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchNotifications = async (currentOffset: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/store/biz/notifications?limit=${limit}&offset=${currentOffset}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("获取通知失败")
      const data = await res.json()
      setNotifications(data.data?.rows || [])
      setTotal(data.data?.total || 0)
      setOffset(currentOffset)
    } catch (e: any) {
      setError(e.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications(0) }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/store/biz/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch {
      // 忽略错误
    }
  }

  if (loading && notifications.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900">通知消息</h1>
        <span className="text-sm text-gray-500">共 {total} 条</span>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-lg border shadow-sm p-4 ${
                n.is_read ? "border-gray-200" : "border-blue-300 bg-blue-50/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{n.title}</h3>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{n.recipient_type === "user" ? "管理员" : "客户"}</span>
                    <span>{new Date(n.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4 whitespace-nowrap"
                  >
                    标记已读
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 分页 */}
          {total > limit && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">
                显示 {offset + 1}-{Math.min(offset + limit, total)} / {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchNotifications(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => fetchNotifications(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
