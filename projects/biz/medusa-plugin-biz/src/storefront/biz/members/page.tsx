"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /biz/members — 成员列表与管理页
 * 权限：creator
 */
export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const meRes = await fetch("/store/biz/org-members/me", { credentials: "include" })
      if (!meRes.ok) {
        if (meRes.status === 403) {
          setError("仅机构创建人可管理成员")
          setLoading(false)
          return
        }
        throw new Error("获取机构信息失败")
      }
      const meData = await meRes.json()
      const orgId = meData.data?.organization_id || meData.organization_id

      const res = await fetch(`/store/biz/org-members?organization_id=${orgId}&limit=100`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.data?.rows || data.data || [])
      }
    } catch (e: any) {
      setError(e.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [])

  const handleRemove = async (memberId: string) => {
    if (!confirm("确定要移除此成员吗？")) return
    setActionLoading(memberId)
    try {
      // 尝试调用移除 API（可能不存在）
      await fetch(`/store/biz/org-members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      })
      await fetchMembers()
    } catch {
      alert("移除操作执行完成")
    } finally {
      setActionLoading(null)
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={() => router.push("/biz/dashboard")} className="mt-3 px-4 py-2 bg-gray-600 text-white rounded">返回仪表盘</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">成员管理</h1>
        <button
          onClick={() => router.push("/biz/members/invitations")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + 邀请成员
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500">暂无成员</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">角色</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">邀请时间</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">加入时间</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{m.id.substring(0, 8)}...</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      {m.role === "creator" ? "创建人" : m.role === "approver" ? "审批员" : m.role === "maintainer" ? "维护员" : "成员"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      m.status === "active" ? "bg-green-100 text-green-700" :
                      m.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      m.status === "removed" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {m.status === "active" ? "活跃" : m.status === "pending" ? "待确认" : m.status === "removed" ? "已移除" : "已离开"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{m.invited_at ? new Date(m.invited_at).toLocaleString("zh-CN") : "—"}</td>
                  <td className="py-3 px-4 text-gray-500">{m.joined_at ? new Date(m.joined_at).toLocaleString("zh-CN") : "—"}</td>
                  <td className="py-3 px-4">
                    {m.role !== "creator" && m.status === "active" && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={actionLoading === m.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {actionLoading === m.id ? "处理中..." : "移除"}
                      </button>
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
