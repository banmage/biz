"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

type OrgRole = "creator" | "approver" | "maintainer" | "member"

interface OrgMemberInfo {
  orgId: string
  orgRole: OrgRole
}

interface MenuItem {
  key: string
  label: string
  href: string
}

const ALL_MENU_ITEMS: Record<string, MenuItem> = {
  dashboard: { key: "dashboard", label: "仪表盘", href: "/biz" },
  profile: { key: "profile", label: "机构资料", href: "/biz/profile" },
  members: { key: "members", label: "成员管理", href: "/biz/members" },
  invitations: { key: "invitations", label: "邀请管理", href: "/biz/invitations" },
  products: { key: "products", label: "商品管理", href: "/biz/products" },
  review: { key: "review", label: "审核中心", href: "/biz/review" },
  notifications: { key: "notifications", label: "通知消息", href: "/biz/notifications" },
}

const ROLE_MENU_KEYS: Record<OrgRole, string[]> = {
  creator: ["dashboard", "profile", "members", "invitations", "products", "review", "notifications"],
  approver: ["dashboard", "products", "review", "notifications"],
  maintainer: ["dashboard", "products", "notifications"],
  member: ["dashboard", "products", "notifications"],
}

function LoadingSidebar() {
  return (
    <div className="w-64 bg-slate-800 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 bg-slate-700/50 rounded-md animate-pulse" />
        ))}
      </nav>
    </div>
  )
}

export default function BizLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [orgInfo, setOrgInfo] = useState<OrgMemberInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrgInfo = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/store/biz/org-members/me", {
        credentials: "include",
      })

      if (res.status === 403 || res.status === 404) {
        router.replace("/biz/apply")
        return
      }

      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`)
      }

      const data: OrgMemberInfo = await res.json()
      setOrgInfo(data)
    } catch (err) {
      if (err instanceof Error && err.message.includes("fetch")) {
        setError("网络错误，请稍后重试")
      } else {
        setError(err instanceof Error ? err.message : "加载失败")
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchOrgInfo()
  }, [fetchOrgInfo])

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <LoadingSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
            <span className="text-sm text-gray-500">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !orgInfo) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <LoadingSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
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
            <p className="text-sm text-red-600">{error || "加载失败"}</p>
            <button
              onClick={fetchOrgInfo}
              className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  const menuKeys = ROLE_MENU_KEYS[orgInfo.orgRole] || ROLE_MENU_KEYS.member
  const menuItems = menuKeys.map((key) => ALL_MENU_ITEMS[key]).filter(Boolean)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-slate-800 min-h-screen flex flex-col fixed left-0 top-0 bottom-0">
        {/* 标题 */}
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-lg font-semibold text-white">机构中心</h1>
          <p className="text-xs text-slate-400 mt-1">
            角色：
            <span className="text-slate-300 ml-1">
              {orgInfo.orgRole === "creator" && "创建者"}
              {orgInfo.orgRole === "approver" && "审核员"}
              {orgInfo.orgRole === "maintainer" && "维护者"}
              {orgInfo.orgRole === "member" && "成员"}
            </span>
          </p>
        </div>

        {/* 菜单 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 底部返回商店 */}
        <div className="px-3 py-4 border-t border-slate-700">
          <Link
            href="/"
            className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回商店
          </Link>
        </div>
      </aside>

      {/* 右侧内容区域 */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
