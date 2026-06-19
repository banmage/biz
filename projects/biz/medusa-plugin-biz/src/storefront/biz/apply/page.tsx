"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /biz/apply — 入驻申请页
 * 权限：未登录或未加入机构用户
 */
export default function ApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: "",
    type: "",
    main_business_area: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  })

  // 检查是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/store/biz/org-members/me", { credentials: "include" })
        if (res.ok) {
          // 已加入机构，重定向到仪表盘
          router.replace("/biz/dashboard")
        }
      } catch {
        // 未登录，留在申请页
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async () => {
    setError(null)

    // 基本校验
    if (!form.name.trim()) { alert("请填写机构名称"); return }
    if (!form.type) { alert("请选择机构类型"); return }
    if (!form.contact_name.trim()) { alert("请填写联系人"); return }
    if (!form.contact_phone.trim()) { alert("请填写手机号"); return }
    if (!/^1[3-9]\d{9}$/.test(form.contact_phone)) { alert("手机号格式不正确"); return }

    setLoading(true)
    try {
      const res = await fetch("/store/biz/organization-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error?.message || "提交失败")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">申请提交成功！</h1>
        <p className="text-gray-600 mb-6">您的入驻申请已提交，请等待平台管理员审核。</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">机构入驻申请</h1>
      <p className="text-gray-500 mb-8">填写以下信息提交入驻申请，平台审核通过后即可使用机构中心功能。</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">机构名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="XX科技有限公司"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">机构类型 *</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">请选择</option>
            <option value="企业">企业</option>
            <option value="个体户">个体户</option>
            <option value="工作室">工作室</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主营业务</label>
          <input
            type="text"
            value={form.main_business_area}
            onChange={(e) => setForm({ ...form, main_business_area: e.target.value })}
            placeholder="智能硬件研发"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              placeholder="张三"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号 *</label>
            <input
              type="text"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="13800138000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            placeholder="zhangsan@xx.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "提交中..." : "提交申请"}
          </button>
        </div>
      </div>
    </div>
  )
}
