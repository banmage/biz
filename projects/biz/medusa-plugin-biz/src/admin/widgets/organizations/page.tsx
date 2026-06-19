import { useState, useEffect, useCallback } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

type OrganizationStatus = "active" | "suspended" | "banned"

interface Organization {
  id: string
  name: string
  type: string
  status: OrganizationStatus
  contact: string
  created_at: string
}

interface FetchResult {
  data: Organization[]
  count: number
}

const StatusBadge = ({ status }: { status: OrganizationStatus }) => {
  const styles: Record<OrganizationStatus, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    banned: "bg-red-100 text-red-800",
  }

  const labels: Record<OrganizationStatus, string> = {
    active: "正常",
    suspended: "已暂停",
    banned: "已封禁",
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

const ActionButtons = ({
  status,
  onAction,
}: {
  status: OrganizationStatus
  onAction: (event: string) => void
}) => {
  const buttons: { event: string; label: string; className: string }[] = []

  if (status === "active") {
    buttons.push({
      event: "suspend",
      label: "暂停",
      className: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
    })
    buttons.push({
      event: "ban",
      label: "封禁",
      className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    })
  } else if (status === "suspended") {
    buttons.push({
      event: "activate",
      label: "激活",
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    })
    buttons.push({
      event: "ban",
      label: "封禁",
      className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    })
  } else if (status === "banned") {
    buttons.push({
      event: "activate",
      label: "激活",
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    })
  }

  return (
    <div className="flex items-center gap-2">
      {buttons.map((btn) => (
        <button
          key={btn.event}
          onClick={() => onAction(btn.event)}
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
    <p className="mt-2 text-sm text-gray-500">暂无机构数据</p>
  </div>
)

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
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

const fetchOrganizations = async (): Promise<FetchResult> => {
  const res = await fetch("/admin/biz/organizations?limit=20&offset=0", {
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`)
  }

  const json = await res.json()
  return json
}

const updateOrganizationStatus = async (id: string, event: string): Promise<void> => {
  const res = await fetch(`/admin/biz/organizations/${id}/status`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event }),
  })

  if (!res.ok) {
    throw new Error(`操作失败 (${res.status})`)
  }
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

export const OrganizationsWidget = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchOrganizations()
      setOrganizations(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAction = async (id: string, event: string) => {
    setActionLoading(id)
    try {
      await updateOrganizationStatus(id, event)
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
          <h3 className="text-base font-semibold text-gray-900">机构管理</h3>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error && organizations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">机构管理</h3>
        </div>
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">机构管理</h3>
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

      {organizations.length === 0 ? (
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
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  联系人
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
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {org.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {org.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {org.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {org.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {actionLoading === org.id ? (
                      <span className="text-xs text-gray-400">处理中...</span>
                    ) : (
                      <ActionButtons
                        status={org.status}
                        onAction={(event) => handleAction(org.id, event)}
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
  zone: "role.list.after",
})

export default OrganizationsWidget
