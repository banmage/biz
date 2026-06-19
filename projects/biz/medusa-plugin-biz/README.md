# Medusa Biz Plugin

Medusa v2 业务插件 — 机构入驻、双层审核、产品扩展系统。

## 功能

- **机构入驻**：申请 → 平台审核 → 自动创建机构 + 创建人
- **成员管理**：邀请/接受/移除/退出，creator 保护
- **产品扩展**：唯一产品创建入口（createProductsWorkflow + ProductExtension 同事务）
- **双层审核**：机构内审（approver）→ 平台终审（admin/reviewer）
- **评论打分**：四维评分（overall/innovation/complexity/novelty）+ 审核
- **站内通知**：机构操作触发的站内消息
- **审计日志**：Trigger 保护不可变，afterCommit 安全写入
- **兜底机制**：productsCreated Hook 确保任何 Product 必有 ProductExtension
- **Admin UI**：7 个 Widget（基于 @medusajs/admin-sdk）
- **Storefront**：9 个机构中心页面（Next.js App Router）

## 安装

```bash
# 在 Medusa 主应用中
pnpm add @your-org/medusa-plugin-biz
```

## 配置

在 `medusa-config.ts` 中注册插件：

```ts
module.exports = defineConfig({
  plugins: [
    {
      resolve: "@your-org/medusa-plugin-biz",
      options: {},
    },
  ],
})
```

## 环境变量

```env
# 超级管理员邮箱（seed 脚本用）
BIZ_INITIAL_SUPER_ADMIN_EMAIL=admin@example.com

# 数据库（由主应用提供）
DATABASE_URL=postgres://postgres:***@localhost:5432/medusa
```

## 开发

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm run build

# 测试
pnpm run test
```

## 架构

```
@your-org/medusa-plugin-biz/
├── src/
│   ├── modules/           # 业务模块（DML + Service + Migration）
│   │   ├── bizOrganization/      # 机构域
│   │   ├── bizOrgMember/         # 机构成员域
│   │   ├── bizProductExtension/  # 产品扩展域（核心）
│   │   ├── bizReview/            # 评论打分域
│   │   ├── bizNotification/      # 通知域
│   │   └── bizAuditLog/          # 审计日志域
│   ├── api/               # API 路由
│   │   ├── admin/biz/    # Admin API（7 组）
│   │   ├── store/biz/    # Store API（7 组）
│   │   └── middlewares.ts # 中间件统一注册
│   ├── admin/widgets/     # Admin SDK Widget（7 个）
│   ├── storefront/biz/    # Storefront 页面（9 个）
│   ├── lib/               # 工具函数（错误码、状态机、分页等）
│   ├── links/             # Module Links
│   ├── subscribers/       # 事件订阅
│   ├── seeds/             # 种子脚本
│   ├── constants/         # 常量
│   └── types/             # 全局类型
├── package.json
└── README.md
```

## 迁移

按顺序执行迁移文件（001 → 008）：

| 编号 | 内容 |
|------|------|
| 001 | biz_organization（机构 + 入驻申请） |
| 002 | biz_org_member（机构成员） |
| 003 | biz_product_extension（产品扩展 + 审核日志 + round 唯一约束） |
| 004 | biz_product_review（评论打分） |
| 005 | biz_notification（通知 + 复合索引） |
| 006 | biz_audit_log（审计日志 + Trigger 不可变） |
| 007 | biz_upload_security（上传安全字段，预留） |
| 008 | biz_soft_delete（软删除字段） |

## API 概览

### Admin API (`/admin/biz/*`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/biz/organization-applications | 入驻申请列表 |
| POST | /admin/biz/organization-applications/:id/review | 审核入驻 |
| GET | /admin/biz/organizations | 机构列表 |
| POST | /admin/biz/organizations/:id/status | 变更机构状态 |
| GET | /admin/biz/products | 产品列表 |
| POST | /admin/biz/products/:id/org-review | 机构内审 |
| POST | /admin/biz/products/:id/platform-review | 平台终审 |
| GET | /admin/biz/reviews | 评论列表 |
| POST | /admin/biz/reviews/:id/moderate | 评论审核 |
| GET | /admin/biz/audit-logs | 审计日志 |
| GET | /admin/biz/notifications | 后台通知 |

### Store API (`/store/biz/*`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /store/biz/products | 创建产品 |
| POST | /store/biz/products/:id/submit | 提交审核 |
| GET | /store/biz/products/:id/extension | 产品扩展信息 |
| GET | /store/biz/products/:id/reviews | 已发布评论 |
| POST | /store/biz/products/:id/reviews | 发表评论 |
| GET | /store/biz/org-members/me | 当前成员信息 |
| POST | /store/biz/org-members/invitations/:id/respond | 响应邀请 |
| GET | /store/biz/notifications | 通知列表 |
| POST | /store/biz/notifications/:id/read | 标记已读 |
| POST | /store/biz/organization-applications | 提交入驻申请 |

## 核心设计

- **单入口**：所有写操作必须通过 `/store/biz/*` 或 `/admin/biz/*`
- **Actor 模型**：平台角色（User.metadata.biz_role）与机构角色（OrgMember.role）严格隔离
- **一致性**：业务数据强一致（单事务），审计日志尽力写入（afterCommit）
- **兜底**：productsCreated Hook 确保数据一致性最后防线

## License

UNLICENSED
