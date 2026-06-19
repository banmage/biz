import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, useCallback } from "react"

interface AuditLog {
  id: string
  actor_type: string
  actor_id: string
  action: string
  target_type: string
  target_id: string
  result: string
  created_at: string
}

interface FetchState {
  logs: AuditLog[]
  loading: boolean
  error: string | null
}

const API_BASE = "/admin/biz/audit-logs"

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default function AuditLogsWidget() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [filterTargetType, setFilterTargetType] = useState("")
  const [filterTargetId, setFilterTargetId] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set("limit", "20")
    params.set("offset", "0")
    if (filterTargetType.trim()) {
      params.set("target_type", filterTargetType.trim())
    }
    if (filterTargetId.trim()) {
      params.set("target_id", filterTargetId.trim())
    }

    try {
      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      // 兼容 { data: [...] } 或直接返回数组
      const items: AuditLog[] = Array.isArray(data) ? data : data.data ?? []
      setLogs(items)
    } catch (err: any) {
      setError(err?.message ?? "加载审计日志失败")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filterTargetType, filterTargetId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilter = () => {
    fetchLogs()
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">审计日志</h2>

      {/* 筛选区 */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="target_type"
          value={filterTargetType}
          onChange={(e) => setFilterTargetType(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="target_id"
          value={filterTargetId}
          onChange={(e) => setFilterTargetId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleFilter}
          className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 transition-colors"
        >
          筛选
        </button>
      </div>

      {/* 状态展示 */}
      {loading && (
        <div className="text-gray-500 text-sm py-8 text-center">加载中…</div>
      )}

      {error && !loading && (
        <div className="text-red-600 text-sm py-4 px-3 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="text-gray-400 text-sm py-8 text-center">暂无审计日志</div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium text-gray-700 border-b">ID</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">actor_type</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">actor_id</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">action</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">target_type</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">target_id</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">result</th>
                <th className="px-3 py-2 font-medium text-gray-700 border-b">created_at</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b text-gray-600 font-mono text-xs">{log.id}</td>
                  <td className="px-3 py-2 border-b">{log.actor_type}</td>
                  <td className="px-3 py-2 border-b font-mono text-xs">{log.actor_id}</td>
                  <td className="px-3 py-2 border-b">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b">{log.target_type}</td>
                  <td className="px-3 py-2 border-b font-mono text-xs">{log.target_id}</td>
                  <td className="px-3 py-2 border-b">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded ${
                        log.result === "success"
                          ? "bg-green-100 text-green-800"
                          : log.result === "failure"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("zh-CN")}
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
