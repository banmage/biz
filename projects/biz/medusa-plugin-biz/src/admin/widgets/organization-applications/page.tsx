import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, useCallback } from "react"

interface OrganizationApplication {
  id: string
  organization_name: string
  type: string
  contact_name: string
  contact_phone: string
  status: string
  created_at: string
}

interface ApplicationListResponse {
  data: OrganizationApplication[]
  count: number
  limit: number
  offset: number
}

const API_BASE = "/admin/biz/organization-applications"

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function OrganizationApplicationsWidget() {
  const [applications, setApplications] = useState<OrganizationApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_BASE}?status=pending&limit=20&offset=0`,
        { credentials: "include" }
      )
      if (!res.ok) {
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }
      const json: ApplicationListResponse = await res.json()
      setApplications(json.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? "加载失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`${API_BASE}/${id}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status} ${res.statusText}`)
      }
      await fetchApplications()
    } catch (err: any) {
      alert(err?.message ?? "操作失败")
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectModal = (id: string) => {
    setRejectTargetId(id)
    setRejectReason("")
    setRejectModalOpen(true)
  }

  const handleRejectSubmit = async () => {
    if (!rejectTargetId) return
    if (!rejectReason.trim()) {
      alert("请填写驳回原因")
      return
    }
    setRejectSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/${rejectTargetId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reject_reason: rejectReason.trim() }),
      })
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status} ${res.statusText}`)
      }
      setRejectModalOpen(false)
      setRejectTargetId(null)
      setRejectReason("")
      await fetchApplications()
    } catch (err: any) {
      alert(err?.message ?? "操作失败")
    } finally {
      setRejectSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          onClick={fetchApplications}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
        <p className="text-sm text-gray-500">暂无待审核的机构申请</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          机构入驻申请
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({applications.length} 条待审核)
          </span>
        </h3>
        <button
          onClick={fetchApplications}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          刷新
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                机构名
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                联系人
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                手机
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                申请时间
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 font-mono">
                  {app.id.slice(0, 8)}...
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {app.organization_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {app.type}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {app.contact_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {app.contact_phone}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[app.status] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabels[app.status] ?? app.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {formatDate(app.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading === app.id}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === app.id ? "处理中..." : "通过"}
                    </button>
                    <button
                      onClick={() => openRejectModal(app.id)}
                      disabled={actionLoading === app.id}
                      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      驳回
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!rejectSubmitting) {
                setRejectModalOpen(false)
                setRejectTargetId(null)
                setRejectReason("")
              }
            }}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900">驳回申请</h4>
            <p className="mt-1 text-sm text-gray-500">
              请填写驳回原因，申请人将看到此原因。
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              rows={4}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={rejectSubmitting}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setRejectTargetId(null)
                  setRejectReason("")
                }}
                disabled={rejectSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectSubmitting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectSubmitting ? "提交中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrganizationApplicationsWidget

export const config = defineWidgetConfig({
  zone: "role.list.before",
})
