import { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

interface User {
  id: string
  email: string
  metadata: {
    biz_role?: string
  }
  created_at: string
}

const ROLE_OPTIONS = [
  { value: "super_admin", label: "超级管理员" },
  { value: "admin", label: "管理员" },
  { value: "reviewer", label: "审核员" },
  { value: "", label: "无角色" },
]

function RolesWidget() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/admin/users?limit=20&offset=0", {
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`)
      }
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch (err: any) {
      setError(err.message || "加载用户列表失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const openAssignModal = (user: User) => {
    setAssigningId(user.id)
    setSelectedRole(user.metadata?.biz_role ?? "")
    setShowModal(true)
  }

  const handleAssign = async () => {
    if (!assigningId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/users/${assigningId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { biz_role: selectedRole || undefined },
        }),
      })
      if (!res.ok) {
        throw new Error(`分配失败: ${res.status}`)
      }
      setShowModal(false)
      await fetchUsers()
    } catch (err: any) {
      alert(err.message || "角色分配失败")
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleLabel = (role?: string) => {
    if (!role) return "无"
    const found = ROLE_OPTIONS.find((o) => o.value === role)
    return found ? found.label : role
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("zh-CN")
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">平台角色分配</h2>

      {loading && (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="text-center py-8 text-gray-500">暂无用户数据</div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  当前角色
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 border-b last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {user.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {getRoleLabel(user.metadata?.biz_role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => openAssignModal(user)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                      分配角色
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 角色选择弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-base font-semibold mb-4">分配角色</h3>
            <div className="space-y-2 mb-6">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selectedRole === opt.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "提交中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RolesWidget

export const config = defineWidgetConfig({
  zone: "customer.list.before",
})
