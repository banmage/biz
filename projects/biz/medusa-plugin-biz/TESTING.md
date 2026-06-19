# Medusa Biz Plugin MVP 测试验证手册

> **版本**: 1.0.0
> **插件路径**: /home/jlx/projects/biz/medusa-plugin-biz/
> **主应用**: /home/jlx/projects/medusa-biz-platform/
> **数据库**: PostgreSQL (Docker, 端口 5432, 数据库 medusa_store, 用户 postgres)
> **Redis**: (Docker, 端口 6379)

---

## 零、验证前准备

### 0.1 环境检查清单

```bash
# 1. 确认数据库运行
docker ps | grep medusa_biz_postgres

# 2. 确认 Redis 运行
docker ps | grep medusa_biz_redis

# 3. 确认 symlink 正确
ls -la /home/jlx/projects/medusa-biz-platform/packages/medusa-plugin-biz
# 应显示指向 /home/jlx/projects/biz/medusa-plugin-biz 的软链接

# 4. 确认插件表已创建
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\dt biz_*"
# 应列出 8 张表
```

### 0.2 数据库表清单（8 张定制表）

| 表名 | 说明 | 对应模块 |
|------|------|----------|
| `biz_organization` | 机构主表 | bizOrganization |
| `biz_organization_application` | 入驻申请表 | bizOrganization |
| `biz_org_member` | 机构成员表 | bizOrgMember |
| `biz_product_extension` | 产品扩展表 | bizProductExtension |
| `biz_product_review_log` | 产品审核日志表 | bizProductExtension |
| `biz_product_review` | 产品评论表 | bizReview |
| `biz_notification` | 通知表 | bizNotification |
| `biz_audit_log` | 审计日志表 | bizAuditLog |

### 0.3 测试账号准备

```bash
# 创建超级管理员（用于 Admin API 测试）
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO \"user\" (id, first_name, last_name, email, metadata, created_at, updated_at)
VALUES ('usr_super_admin', 'Super', 'Admin', 'admin@example.com', '{\"biz_role\": \"super_admin\"}'::jsonb, NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 创建 auth_identity
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO auth_identity (id) VALUES ('auth_usr_super_admin')
ON CONFLICT DO NOTHING;
"

# 创建测试 Customer（用于 Store API 测试）
# 通过 Medusa 默认注册 API 创建，或直接在 customer 表插入
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO customer (id, email, first_name, last_name, created_at, updated_at)
VALUES ('cus_test_001', 'test@example.com', 'Test', 'User', NOW(), NOW())
ON CONFLICT DO NOTHING;
"
```

### 0.4 JWT Token 生成

Admin API 和 Store API 都需要 JWT 认证：

```bash
# Admin Token（超级管理员）
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { actor_id: 'usr_super_admin', actor_type: 'user', auth_identity_id: 'auth_usr_super_admin' },
  'supersecret',
  { expiresIn: '1h' }
);
console.log('ADMIN_TOKEN=' + token);
"

# Store Token（Customer）
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { actor_id: 'cus_test_001', actor_type: 'customer', auth_identity_id: 'auth_cus_test_001' },
  'supersecret',
  { expiresIn: '1h' }
);
console.log('STORE_TOKEN=' + token);
"
```

将生成的 token 导出为环境变量，后续所有 curl 命令使用：
```bash
export ADMIN_TOKEN="<上面生成的 admin token>"
export STORE_TOKEN="<上面生成的 store token>"
export BASE_URL="http://localhost:9000"
```

---

## 一、Admin API 测试（8 个路由）

### 1.1 机构入驻申请审核

**路由**: `POST /admin/biz/organization-applications/:id/review`

**测试步骤**:

```bash
# Step 1: 先创建一个入驻申请
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization_application (id, applicant_id, name, type, contact_name, contact_phone, status, created_at, updated_at)
VALUES ('app_test_001', 'cus_test_001', '测试机构', 'enterprise', '张三', '13800138000', 'pending', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# Step 2: 审核通过
curl -s -X POST "$BASE_URL/admin/biz/organization-applications/app_test_001/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .

# 预期: {"success": true, "data": {...}}

# Step 3: 验证数据库状态
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, status, reviewed_by, reviewed_at FROM biz_organization_application WHERE id = 'app_test_001';
"
# 预期: status = 'approved', reviewed_by = 'usr_super_admin', reviewed_at IS NOT NULL

# Step 4: 测试拒绝
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization_application (id, applicant_id, name, type, contact_name, contact_phone, status, created_at, updated_at)
VALUES ('app_test_002', 'cus_test_001', '测试机构2', 'individual', '李四', '13900139000', 'pending', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

curl -s -X POST "$BASE_URL/admin/biz/organization-applications/app_test_002/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "reject_reason": "资质不全"}' | jq .

# 预期: status = 'rejected', reject_reason = '资质不全'
```

**验证要点**:
- [ ] 审核通过后 status 变为 approved
- [ ] 拒绝后 status 变为 rejected，reject_reason 正确保存
- [ ] reviewed_by 和 reviewed_at 自动填充
- [ ] 审核不存在的申请返回 404

---

### 1.2 机构列表查询

**路由**: `GET /admin/biz/organizations`

```bash
# 先创建测试机构数据
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization (id, name, type, status, contact_name, contact_phone, created_at, updated_at)
VALUES 
  ('org_test_001', '活跃机构A', 'enterprise', 'active', '张三', '13800138000', NOW(), NOW()),
  ('org_test_002', '暂停机构B', 'individual', 'suspended', '李四', '13900139000', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询全部
curl -s "$BASE_URL/admin/biz/organizations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 按状态过滤
curl -s "$BASE_URL/admin/biz/organizations?status=active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 分页
curl -s "$BASE_URL/admin/biz/organizations?limit=1&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回机构列表
- [ ] status 过滤正确
- [ ] 分页参数生效

---

### 1.3 机构状态变更

**路由**: `POST /admin/biz/organizations/:id/status`

```bash
# 暂停机构
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_001/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "suspend"}' | jq .

# 验证
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, status FROM biz_organization WHERE id = 'org_test_001';
"
# 预期: status = 'suspended'

# 恢复激活
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_001/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "activate"}' | jq .

# 封禁
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_002/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "ban"}' | jq .
```

**验证要点**:
- [ ] suspend → status 变为 suspended
- [ ] activate → status 变为 active
- [ ] ban → status 变为 banned
- [ ] 非法状态转换返回 409 + BIZ_INVALID_STATE_TRANSITION

---

### 1.4 待审核产品列表

**路由**: `GET /admin/biz/products`

```bash
# 先创建测试产品扩展数据
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_product_extension (id, product_id, organization_id, review_status, created_at, updated_at)
VALUES 
  ('pe_test_001', 'prod_test_001', 'org_test_001', 'platform_pending', NOW(), NOW()),
  ('pe_test_002', 'prod_test_002', 'org_test_001', 'draft', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询全部待审核
curl -s "$BASE_URL/admin/biz/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 按状态过滤
curl -s "$BASE_URL/admin/biz/products?review_status=platform_pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回产品扩展列表
- [ ] review_status 过滤正确

---

### 1.5 平台终审

**路由**: `POST /admin/biz/products/:id/platform-review`

```bash
# 平台审核通过（带评分）
curl -s -X POST "$BASE_URL/admin/biz/products/pe_test_001/platform-review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "scores": {
      "innovation": 8,
      "complexity": 7,
      "novelty": 9
    }
  }' | jq .

# 验证数据库
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, review_status, platform_innovation_score, platform_complexity_score, platform_novelty_score
FROM biz_product_extension WHERE id = 'pe_test_001';
"
# 预期: review_status = 'published', 三个评分字段有值

# 平台审核拒绝
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_product_extension (id, product_id, organization_id, review_status, created_at, updated_at)
VALUES ('pe_test_003', 'prod_test_003', 'org_test_001', 'platform_pending', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

curl -s -X POST "$BASE_URL/admin/biz/products/pe_test_003/platform-review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "reject_reason": "不符合平台标准"}' | jq .

# 验证审核日志
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, round, reviewer_scope, action, reject_reason FROM biz_product_review_log
WHERE product_extension_id = 'pe_test_003';
"
```

**验证要点**:
- [ ] approve → review_status 变为 published，评分正确保存
- [ ] reject → review_status 更新，reject_reason 保存
- [ ] 审核日志 biz_product_review_log 自动写入
- [ ] 非 platform_pending 状态的产品审核返回 409

---

### 1.6 评论管理

**路由**: `GET /admin/biz/reviews` + `POST /admin/biz/reviews/:id/moderate`

```bash
# 先创建测试评论
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_product_review (id, product_id, customer_id, content, overall_score, innovation_score, complexity_score, novelty_score, status, created_at, updated_at)
VALUES 
  ('rev_test_001', 'prod_test_001', 'cus_test_001', '非常好的产品！', 9, 8, 8, 9, 'pending', NOW(), NOW()),
  ('rev_test_002', 'prod_test_001', 'cus_test_001', '一般般', 5, 5, 5, 5, 'pending', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询评论列表
curl -s "$BASE_URL/admin/biz/reviews" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 审核通过
curl -s -X POST "$BASE_URL/admin/biz/reviews/rev_test_001/moderate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .

# 隐藏评论
curl -s -X POST "$BASE_URL/admin/biz/reviews/rev_test_002/moderate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "hide"}' | jq .

# 验证
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, status, reviewed_by FROM biz_product_review WHERE id IN ('rev_test_001', 'rev_test_002');
"
# 预期: rev_test_001 status='published', rev_test_002 status='hidden'
```

**验证要点**:
- [ ] approve → status 变为 published
- [ ] hide → status 变为 hidden
- [ ] unhide → status 恢复 published
- [ ] reviewed_by 和 reviewed_at 自动填充

---

### 1.7 通知查询（Admin）

**路由**: `GET /admin/biz/notifications`

```bash
# 先创建测试通知
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_notification (id, recipient_type, recipient_id, type, title, content, is_read, created_at, updated_at)
VALUES 
  ('notif_test_001', 'user', 'usr_super_admin', 'application_approved', '申请已通过', '您的入驻申请已通过审核', false, NOW(), NOW()),
  ('notif_test_002', 'user', 'usr_super_admin', 'product_published', '产品已发布', '您的产品已通过平台审核', false, NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询通知列表
curl -s "$BASE_URL/admin/biz/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回当前管理员的通知列表
- [ ] 分页参数生效

---

### 1.8 审计日志查询

**路由**: `GET /admin/biz/audit-logs`

```bash
# 先创建测试审计日志
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_audit_log (id, actor_type, actor_id, action, target_type, target_id, result, details, created_at, updated_at)
VALUES 
  ('audit_test_001', 'user', 'usr_super_admin', 'review_application', 'biz_organization_application', 'app_test_001', 'success', '{\"action\": \"approve\"}'::jsonb, NOW(), NOW()),
  ('audit_test_002', 'user', 'usr_super_admin', 'platform_review', 'biz_product_extension', 'pe_test_001', 'success', '{\"action\": \"approve\", \"scores\": {\"innovation\": 8}}'::jsonb, NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询全部
curl -s "$BASE_URL/admin/biz/audit-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 按 target_type 过滤
curl -s "$BASE_URL/admin/biz/audit-logs?target_type=biz_organization_application" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 按 target_id 过滤
curl -s "$BASE_URL/admin/biz/audit-logs?target_id=pe_test_001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回审计日志列表
- [ ] target_type 过滤正确
- [ ] target_id 过滤正确
- [ ] details JSON 字段正确返回

---

## 二、Store API 测试（8 个路由）

### 2.1 获取当前用户机构信息

**路由**: `GET /store/biz/org-members/me`

```bash
# 先创建机构成员数据
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_org_member (id, organization_id, customer_id, role, status, created_at, updated_at)
VALUES ('om_test_001', 'org_test_001', 'cus_test_001', 'creator', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

curl -s "$BASE_URL/store/biz/org-members/me" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回当前用户的机构信息和角色
- [ ] 未加入机构的用户返回空或 404

---

### 2.2 邀请成员

**路由**: `POST /store/biz/org-members/invitations`

```bash
curl -s -X POST "$BASE_URL/store/biz/org-members/invitations" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "newmember@example.com", "role": "member"}' | jq .

# 预期: {"success": true, "data": {"message": "邀请已发送（MVP 测试模式）"}}
```

**验证要点**:
- [ ] 返回成功响应
- [ ] 缺少 email 或 role 返回 400 + BIZ_VALIDATION_ERROR

---

### 2.3 处理邀请

**路由**: `POST /store/biz/org-members/invitations/:id/respond`

```bash
# 先创建邀请记录
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_org_member (id, organization_id, customer_id, role, status, invited_by, invited_at, created_at, updated_at)
VALUES ('om_test_invite_001', 'org_test_001', 'cus_test_002', 'member', 'pending', 'cus_test_001', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 接受邀请
curl -s -X POST "$BASE_URL/store/biz/org-members/invitations/om_test_invite_001/respond" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}' | jq .

# 验证
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, status, joined_at FROM biz_org_member WHERE id = 'om_test_invite_001';
"
# 预期: status = 'active', joined_at IS NOT NULL

# 拒绝邀请
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_org_member (id, organization_id, customer_id, role, status, invited_by, invited_at, created_at, updated_at)
VALUES ('om_test_invite_002', 'org_test_001', 'cus_test_003', 'member', 'pending', 'cus_test_001', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;
"

curl -s -X POST "$BASE_URL/store/biz/org-members/invitations/om_test_invite_002/respond" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "decline"}' | jq .
```

**验证要点**:
- [ ] accept → status 变为 active，joined_at 填充
- [ ] decline → status 变为 removed 或 left

---

### 2.4 创建产品（带扩展信息）

**路由**: `POST /store/biz/products`

```bash
curl -s -X POST "$BASE_URL/store/biz/products" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试定制产品",
    "description": "这是一个测试产品",
    "organization_id": "org_test_001"
  }' | jq .

# 验证产品扩展是否自动创建
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, product_id, organization_id, review_status FROM biz_product_extension
WHERE organization_id = 'org_test_001' ORDER BY created_at DESC LIMIT 1;
"
# 预期: review_status = 'draft'
```

**验证要点**:
- [ ] 返回 201 + 产品信息
- [ ] biz_product_extension 自动创建，review_status = draft
- [ ] organization_id 正确关联

---

### 2.5 提交产品审核

**路由**: `POST /store/biz/products/:id/submit`

```bash
# 获取一个 draft 状态的产品扩展ID
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id FROM biz_product_extension WHERE review_status = 'draft' LIMIT 1;
"

# 提交审核（用上一步查到的ID）
curl -s -X POST "$BASE_URL/store/biz/products/pe_test_002/submit" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .

# 验证状态变更
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, review_status FROM biz_product_extension WHERE id = 'pe_test_002';
"
# 预期: review_status = 'org_pending'
```

**验证要点**:
- [ ] draft → org_pending 状态转换成功
- [ ] 非 draft 状态提交返回 409 + BIZ_INVALID_STATE_TRANSITION
- [ ] 审核日志自动写入

---

### 2.6 获取产品扩展信息

**路由**: `GET /store/biz/products/:id/extension`

```bash
curl -s "$BASE_URL/store/biz/products/pe_test_001/extension" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .
```

**验证要点**:
- [ ] 返回产品扩展完整信息
- [ ] 包含 review_status、评分等字段

---

### 2.7 产品评论

**路由**: `POST /store/biz/products/:id/reviews` + `GET /store/biz/products/:id/reviews`

```bash
# 发表评论
curl -s -X POST "$BASE_URL/store/biz/products/prod_test_001/reviews" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这个产品非常好用，推荐购买！",
    "scores": {
      "overall": 9,
      "innovation": 8,
      "complexity": 7,
      "novelty": 9
    }
  }' | jq .

# 验证评论创建
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, product_id, customer_id, content, overall_score, status
FROM biz_product_review ORDER BY created_at DESC LIMIT 1;
"
# 预期: status = 'pending'（需审核后发布）

# 查看已发布评论（公开）
curl -s "$BASE_URL/store/biz/products/prod_test_001/reviews" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .
```

**验证要点**:
- [ ] 评论创建成功，初始 status = pending
- [ ] 评分字段正确保存
- [ ] GET 只返回 published 状态的评论
- [ ] 评论内容少于 10 字符返回 400 + BIZ_REVIEW_TEXT_TOO_SHORT

---

### 2.8 通知（Store）

**路由**: `GET /store/biz/notifications` + `POST /store/biz/notifications/:id/read`

```bash
# 先创建 Customer 类型的通知
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_notification (id, recipient_type, recipient_id, type, title, content, is_read, created_at, updated_at)
VALUES 
  ('notif_store_001', 'customer', 'cus_test_001', 'org_invitation', '机构邀请', '您被邀请加入测试机构', false, NOW(), NOW()),
  ('notif_store_002', 'customer', 'cus_test_001', 'product_approved', '产品审核通过', '您的产品已通过机构内审', false, NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 查询通知列表
curl -s "$BASE_URL/store/biz/notifications" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .

# 标记已读
curl -s -X POST "$BASE_URL/store/biz/notifications/notif_store_001/read" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .

# 验证
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, is_read FROM biz_notification WHERE id = 'notif_store_001';
"
# 预期: is_read = true
```

**验证要点**:
- [ ] 返回当前用户的通知列表
- [ ] markAsRead 后 is_read 变为 true
- [ ] 只能操作自己的通知

---

## 三、状态机流转测试

### 3.1 产品审核状态机

合法流转路径：
```
draft → org_pending → platform_pending → published
  ↓         ↓              ↓
rejected  rejected       rejected
```

**测试步骤**:

```bash
# 创建测试产品扩展
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_product_extension (id, product_id, organization_id, review_status, created_at, updated_at)
VALUES ('pe_sm_test_001', 'prod_sm_001', 'org_test_001', 'draft', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 测试 1: draft → submit → org_pending ✅
curl -s -X POST "$BASE_URL/store/biz/products/pe_sm_test_001/submit" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .

# 测试 2: org_pending → org_review(approve) → platform_pending ✅
curl -s -X POST "$BASE_URL/admin/biz/products/pe_sm_test_001/org-review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "scores": {"innovation": 7, "complexity": 6, "novelty": 8}}' | jq .

# 测试 3: platform_pending → platform_review(approve) → published ✅
curl -s -X POST "$BASE_URL/admin/biz/products/pe_sm_test_001/platform-review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "scores": {"innovation": 8, "complexity": 7, "novelty": 9}}' | jq .

# 测试 4: published → submit → 409 非法转换 ❌
curl -s -X POST "$BASE_URL/store/biz/products/pe_sm_test_001/submit" \
  -H "Authorization: Bearer $STORE_TOKEN" | jq .
# 预期: 409 + BIZ_INVALID_STATE_TRANSITION
```

**验证要点**:
- [ ] 合法流转全部成功
- [ ] 非法流转返回 409 + BIZ_INVALID_STATE_TRANSITION
- [ ] 每次状态变更都写入 biz_product_review_log

### 3.2 机构状态机

合法流转：
```
active → suspended → active
active → banned
suspended → banned
```

```bash
# active → suspend ✅
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_001/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "suspend"}' | jq .

# suspended → activate ✅
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_001/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "activate"}' | jq .

# banned → activate ❌（非法）
curl -s -X POST "$BASE_URL/admin/biz/organizations/org_test_002/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "activate"}' | jq .
# 预期: 409
```

### 3.3 评论状态机

合法流转：
```
pending → published → hidden → published
pending → hidden
any → deleted
```

```bash
# pending → approve → published ✅
curl -s -X POST "$BASE_URL/admin/biz/reviews/rev_test_001/moderate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .

# published → hide → hidden ✅
curl -s -X POST "$BASE_URL/admin/biz/reviews/rev_test_001/moderate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "hide"}' | jq .

# hidden → unhide → published ✅
curl -s -X POST "$BASE_URL/admin/biz/reviews/rev_test_001/moderate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "unhide"}' | jq .
```

---

## 四、错误码测试

### 4.1 权限错误

```bash
# 无 Token 访问 Admin API → 401
curl -s -X POST "$BASE_URL/admin/biz/organization-applications/app_test_001/review" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .

# Store Token 访问 Admin API → 403
curl -s -X POST "$BASE_URL/admin/biz/organization-applications/app_test_001/review" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .
```

### 4.2 资源不存在

```bash
# 审核不存在的申请 → 404
curl -s -X POST "$BASE_URL/admin/biz/organization-applications/app_not_exist/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}' | jq .
# 预期: 404 + BIZ_NOT_FOUND
```

### 4.3 重复申请

```bash
# 同一用户已有 pending 申请时再次申请 → 409
# 需要先插入一条 pending 申请
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization_application (id, applicant_id, name, type, contact_name, contact_phone, status, created_at, updated_at)
VALUES ('app_dup_test', 'cus_test_001', '重复测试', 'enterprise', '王五', '13700137000', 'pending', NOW(), NOW())
ON CONFLICT DO NOTHING;
"

# 再次提交同一用户的申请
# 预期: 409 + BIZ_APPLICATION_ALREADY_EXISTS
```

### 4.4 评论内容过短

```bash
curl -s -X POST "$BASE_URL/store/biz/products/prod_test_001/reviews" \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "短", "scores": {"overall": 5}}' | jq .
# 预期: 400 + BIZ_REVIEW_TEXT_TOO_SHORT
```

---

## 五、数据库表结构验证

### 5.1 表存在性检查

```bash
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'biz_%'
ORDER BY table_name;
"
# 预期: 8 张表全部列出
```

### 5.2 字段完整性检查

```bash
# 机构表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_organization"

# 入驻申请表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_organization_application"

# 机构成员表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_org_member"

# 产品扩展表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_product_extension"

# 审核日志表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_product_review_log"

# 评论表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_product_review"

# 通知表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_notification"

# 审计日志表
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "\d biz_audit_log"
```

### 5.3 默认值验证

```bash
# 插入最小数据，验证默认值
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization (id, name, type, contact_name, contact_phone, created_at, updated_at)
VALUES ('org_default_test', '默认值测试', 'enterprise', '测试', '13800138000', NOW(), NOW());

SELECT id, status FROM biz_organization WHERE id = 'org_default_test';
-- 预期: status = 'active'

INSERT INTO biz_notification (id, recipient_type, recipient_id, type, title, content, created_at, updated_at)
VALUES ('notif_default_test', 'customer', 'cus_test_001', 'test', '测试', '内容', NOW(), NOW());

SELECT id, is_read FROM biz_notification WHERE id = 'notif_default_test';
-- 预期: is_read = false

INSERT INTO biz_org_member (id, organization_id, customer_id, role, created_at, updated_at)
VALUES ('om_default_test', 'org_test_001', 'cus_test_001', 'member', NOW(), NOW());

SELECT id, status FROM biz_org_member WHERE id = 'om_default_test';
-- 预期: status = 'pending'
"
```

### 5.4 枚举约束验证

```bash
# 测试非法枚举值（应被拒绝）
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
INSERT INTO biz_organization (id, name, type, status, contact_name, contact_phone, created_at, updated_at)
VALUES ('org_enum_test', '枚举测试', 'enterprise', 'invalid_status', '测试', '13800138000', NOW(), NOW());
-- 预期: 报错（枚举约束）
"
```

---

## 六、Hook / 订阅者行为验证

### 6.1 productsCreated Hook — 自动创建产品扩展

**测试步骤**:

```bash
# Step 1: 通过 Medusa 标准 API 创建一个 Product
# （不指定 organization_id）
curl -s -X POST "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hook测试产品",
    "description": "测试自动创建扩展"
  }' | jq .

# Step 2: 检查是否自动创建了 biz_product_extension
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, product_id, organization_id, review_status
FROM biz_product_extension
ORDER BY created_at DESC LIMIT 1;
"
# 预期: 自动创建一条记录，review_status = 'draft', organization_id = NULL

# Step 3: 检查是否发送了告警通知给超级管理员
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT id, recipient_type, type, title
FROM biz_notification
WHERE type = 'product_extension_orphan'
ORDER BY created_at DESC LIMIT 1;
"
# 预期: 存在一条通知，title = '未归属机构的产品'
```

### 6.2 并发安全验证

```bash
# 快速连续创建两个同名产品，验证 INSERT ON CONFLICT 不报错
# （模拟并发场景）
curl -s -X POST "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "并发测试1"}' &

curl -s -X POST "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "并发测试2"}' &

wait

# 验证两条产品扩展都创建成功
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT COUNT(*) FROM biz_product_extension WHERE review_status = 'draft';
"
```

---

## 七、Module Links 验证

### 7.1 Product ↔ ProductExtension 链接

```bash
# 验证 product 表有 extension 链接
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT * FROM product_extension LIMIT 5;
"
# 应能通过 product_id 关联查询
```

### 7.2 Customer ↔ OrgMember 链接

```bash
# 验证 customer 表有 org_member 链接
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
SELECT c.id as customer_id, c.email, om.role, om.status
FROM customer c
LEFT JOIN biz_org_member om ON om.customer_id = c.id
WHERE c.id = 'cus_test_001';
"
```

---

## 八、单元测试验证

### 8.1 运行全部测试

```bash
cd /home/jlx/projects/biz/medusa-plugin-biz
npx jest --verbose
```

**预期输出**:
```
Test Suites: 5 passed, 5 total
Tests:       74 passed, 74 total
```

### 8.2 测试覆盖范围

| 测试文件 | 覆盖内容 |
|----------|----------|
| `biz-error-codes.test.ts` | 错误码定义、HTTP 状态码映射、默认消息 |
| `state-machine.test.ts` | 状态转换断言、非法转换检测 |
| `pagination.test.ts` | 分页参数计算 |
| `service-structure.test.ts` | Service 类结构、方法签名 |
| `product-extension.service.test.ts` | 产品扩展 Service 业务逻辑 |

---

## 九、Admin Widget 验证

### 9.1 Widget 文件清单

```bash
cd /home/jlx/projects/biz/medusa-plugin-biz
ls -la src/admin/widgets/
```

应包含 7 个 Widget 目录：
- `audit-logs/` — 审计日志 Widget
- `notifications/` — 通知 Widget
- `organization-applications/` — 入驻申请 Widget
- `organizations/` — 机构管理 Widget
- `products/` — 产品审核 Widget
- `reviews/` — 评论管理 Widget
- `roles/` — 角色权限 Widget

### 9.2 Widget 注册验证

```bash
cat src/admin/widgets/index.ts
# 应导出所有 7 个 Widget 的注册信息
```

---

## 十、测试验证总检查表

### Admin API (8 路由)

| # | 路由 | 方法 | 验证项 | 结果 |
|---|------|------|--------|------|
| 1 | `/admin/biz/organization-applications` | GET | 申请列表+过滤 | [ ] |
| 2 | `/admin/biz/organization-applications/:id/review` | POST | 审核通过/拒绝 | [ ] |
| 3 | `/admin/biz/organizations` | GET | 机构列表+过滤 | [ ] |
| 4 | `/admin/biz/organizations/:id/status` | POST | 状态变更 | [ ] |
| 5 | `/admin/biz/products` | GET | 待审核列表 | [ ] |
| 6 | `/admin/biz/products/:id/platform-review` | POST | 平台终审 | [ ] |
| 7 | `/admin/biz/reviews` | GET+POST | 评论列表+审核 | [ ] |
| 8 | `/admin/biz/notifications` | GET | 通知查询 | [ ] |
| 9 | `/admin/biz/audit-logs` | GET | 审计日志查询 | [ ] |

### Store API (8 路由)

| # | 路由 | 方法 | 验证项 | 结果 |
|---|------|------|--------|------|
| 1 | `/store/biz/org-members/me` | GET | 我的机构信息 | [ ] |
| 2 | `/store/biz/org-members/invitations` | POST | 邀请成员 | [ ] |
| 3 | `/store/biz/org-members/invitations/:id/respond` | POST | 处理邀请 | [ ] |
| 4 | `/store/biz/products` | POST | 创建产品 | [ ] |
| 5 | `/store/biz/products/:id/submit` | POST | 提交审核 | [ ] |
| 6 | `/store/biz/products/:id/extension` | GET | 扩展信息 | [ ] |
| 7 | `/store/biz/products/:id/reviews` | GET+POST | 评论列表+发表 | [ ] |
| 8 | `/store/biz/notifications` | GET+POST | 通知+已读 | [ ] |

### 状态机

| 状态机 | 合法流转 | 非法拦截 | 结果 |
|--------|----------|----------|------|
| 产品审核 | draft→org_pending→platform_pending→published | published→submit | [ ] |
| 机构状态 | active↔suspended, active→banned | banned→activate | [ ] |
| 评论审核 | pending→published→hidden→published | - | [ ] |

### 数据库

| 验证项 | 结果 |
|--------|------|
| 8 张表全部存在 | [ ] |
| 字段与模型定义一致 | [ ] |
| 默认值正确生效 | [ ] |
| 枚举约束正确 | [ ] |
| Module Links 正常 | [ ] |

### Hook / 订阅者

| 验证项 | 结果 |
|--------|------|
| productsCreated 自动创建扩展 | [ ] |
| 无机构产品发送告警通知 | [ ] |
| 并发安全（ON CONFLICT） | [ ] |

### 单元测试

| 验证项 | 结果 |
|--------|------|
| 74 个测试全部通过 | [ ] |
| 5 个测试套件全部通过 | [ ] |

---

## 附录 A：快速清理测试数据

```bash
# 清理所有 biz_ 表中的测试数据（保留表结构）
docker exec medusa_biz_postgres psql -U postgres -d medusa_store -c "
TRUNCATE biz_audit_log, biz_notification, biz_product_review, biz_product_review_log,
         biz_product_extension, biz_org_member, biz_organization_application, biz_organization
RESTART IDENTITY CASCADE;
"
```

## 附录 B：常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 401 Unauthorized | Token 过期或错误 | 重新生成 JWT Token |
| 404 Not Found | 资源 ID 不存在 | 检查数据库中是否有对应记录 |
| 409 Conflict | 非法状态转换 | 检查当前状态是否允许该操作 |
| 500 Internal Error | 服务未启动或数据库连接失败 | 检查 Medusa 服务状态和数据库连接 |
| 表不存在 | 迁移未执行 | 检查迁移文件是否已执行 |
| symlink 失效 | 主应用找不到插件 | 检查 `packages/medusa-plugin-biz` 软链接 |
