import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, useCallback } from "react"

export const config = defineWidgetConfig({
  zone: "order.list.after",
})

interface Notification {
  id: string
  title: string
  content: string
  recipient_type: string
  is_read: boolean
  created_at: string
}

interface FetchResult {
  success: boolean
  data: {
    rows: Notification[]
    total: number
    limit: number
    offset: number
  }
}

/**
 * 后台通知查询页 Widget
 * 
 * 功能：
 * - 只读列表，展示系统通知（分页）
 * - 展示：ID、title、content、recipient_type、is_read、created_at
 * 
 * API：
 * - GET /admin/biz/notifications?limit=20&offset=0
 */
export default function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const fetchNotifications = useCallback(async (currentOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
      })
      const res = await fetch(`/admin/biz/notifications?${params}`, {
        credentials: "include",
      })
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data.rows || [])
        setTotal(json.data.total || 0)
        setOffset(currentOffset)
      } else {
        setError("加载失败")
      }
    } catch (e) {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(0)
  }, [fetchNotifications])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN")
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">后台通知</h2>
        <span className="text-sm text-gray-500">共 {total} 条</span>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchNotifications(0)}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            重试
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🔔</div>
          <p>暂无后台通知</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">标题</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">内容</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">接收人类型</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">状态</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">时间</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono text-xs text-gray-500">
                      {n.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900 max-w-[150px] truncate">
                      {n.title}
                    </td>
                    <td className="py-3 px-2 text-gray-600 max-w-[250px] truncate" title={n.content}>
                      {n.content}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {n.recipient_type === "user" ? "管理员" : "客户"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          n.is_read
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {n.is_read ? "已读" : "未读"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                      {formatDate(n.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                显示 {offset + 1}-{Math.min(offset + limit, total)} / {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchNotifications(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => fetchNotifications(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
