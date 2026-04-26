# CampusFit AI API 设计

## 1. 设计原则

1. 接口与数据库设计一一对应。
2. 优先 REST 风格，降低前后端协作复杂度。
3. 今日页提供聚合接口，减少端侧多次请求。
4. AI 接口独立超时与错误处理，不阻塞主链路。
5. 所有响应包含统一状态、数据和错误结构。

## 2. 通用约定

### 2.1 Base Path

```text
/api/v1
```

### 2.2 鉴权

除登录外，默认使用 Bearer Token。

请求头：

```http
Authorization: Bearer <access_token>
```

### 2.3 统一响应

成功：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数校验失败",
  "data": null,
  "requestId": "req_123"
}
```

### 2.4 通用错误码

| 错误码 | 说明 |
| --- | --- |
| OK | 成功 |
| UNAUTHORIZED | 未登录或 token 无效 |
| FORBIDDEN | 无权限 |
| VALIDATION_ERROR | 参数错误 |
| NOT_FOUND | 资源不存在 |
| CONFLICT | 资源冲突 |
| PLAN_GENERATION_FAILED | 计划生成失败 |
| AI_TIMEOUT | AI 响应超时 |
| AI_SAFETY_BLOCKED | AI 输出被安全策略拦截 |
| INTERNAL_ERROR | 服务内部异常 |

## 3. 认证接口

### 3.1 发送邮箱验证码

`POST /auth/email/send-code`

#### 请求体

```json
{
  "email": "user@example.com"
}
```

#### 响应体

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "sent": true,
    "cooldownSeconds": 60
  }
}
```

### 3.2 邮箱验证码登录

`POST /auth/email/login`

#### 请求体

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### 响应体

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accessToken": "jwt_access",
    "refreshToken": "jwt_refresh",
    "user": {
      "id": "uuid",
      "nickname": "",
      "avatarUrl": "",
      "hasCompletedOnboarding": false
    }
  }
}
```

## 4. 用户档案接口

### 4.1 获取当前用户信息

`GET /users/me`

返回 `users + user_profiles` 聚合结果。

### 4.2 提交建档

`POST /profiles/onboarding`

#### 请求体

```json
{
  "gender": "male",
  "birthYear": 2004,
  "heightCm": 175,
  "currentWeightKg": 72,
  "targetType": "cut",
  "activityLevel": "moderate",
  "trainingExperience": "beginner",
  "trainingDaysPerWeek": 3,
  "dietScene": "canteen",
  "dietPreferences": ["high_protein"],
  "dietRestrictions": ["peanut"],
  "supplementOptIn": true
}
```

#### 响应体

返回建档后的用户档案摘要和是否已触发计划生成。

### 4.3 更新档案

`PATCH /profiles/me`

支持局部更新档案字段，后续可触发计划再生成。

## 5. 今日页与计划接口

### 5.1 获取今日页聚合数据

`GET /today`

#### Query

- `date`：可选，默认当天

#### 响应体结构

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "date": "2026-03-31",
    "summary": {
      "calorieTarget": 2100,
      "proteinTargetG": 140,
      "carbTargetG": 220,
      "fatTargetG": 60
    },
    "dietPlan": {
      "id": "uuid",
      "scene": "canteen",
      "summary": "食堂减脂日方案",
      "meals": []
    },
    "trainingPlan": {
      "id": "uuid",
      "title": "全身训练 A",
      "splitType": "full_body",
      "items": []
    },
    "checkInStatus": {
      "hasCheckedIn": false,
      "dietCompletionRate": null,
      "trainingCompletionRate": null
    },
    "reviewHint": {
      "hasWeeklyReview": true,
      "latestWeekStartDate": "2026-03-30"
    },
    "productEntry": {
      "featuredCategory": "supplement"
    }
  }
}
```

### 5.2 手动生成指定日期计划

`POST /plans/generate`

#### 请求体

```json
{
  "date": "2026-03-31",
  "force": false
}
```

#### 行为说明

1. 读取当前有效档案。
2. 调用规则引擎生成 `daily_plans`、`diet_plans`、`training_plans`。
3. 若 `force=true`，允许覆盖草稿或重建计划。

### 5.3 获取饮食计划详情

`GET /diet-plans/:id`

返回 `diet_plans + diet_plan_items`

### 5.4 获取训练计划详情

`GET /training-plans/:id`

返回 `training_plans + training_plan_items`

## 6. 打卡接口

### 6.1 提交当日打卡

`POST /check-ins`

#### 请求体

```json
{
  "dailyPlanId": "uuid",
  "checkinDate": "2026-03-31",
  "dietCompletionRate": 80,
  "trainingCompletionRate": 100,
  "waterIntakeMl": 1800,
  "stepCount": 7500,
  "weightKg": 71.5,
  "energyLevel": 4,
  "satietyLevel": 3,
  "fatigueLevel": 2,
  "note": "晚饭少吃了米饭"
}
```

#### 响应体

返回保存后的打卡记录和今日页最新状态摘要。

### 6.2 获取打卡详情

`GET /check-ins/:date`

返回当前用户指定日期的打卡记录。

## 7. 周复盘接口

### 7.1 获取最新周复盘

`GET /weekly-reviews/latest`

#### Query

- `weekStartDate`：可选，不传则返回最近一期

### 7.2 触发周复盘生成

`POST /weekly-reviews/generate`

#### 请求体

```json
{
  "weekStartDate": "2026-03-30"
}
```

说明：支持定时任务自动调用，也允许手动补生成。

## 8. AI 接口

### 8.1 创建会话

`POST /ai/conversations`

#### 请求体

```json
{
  "scenario": "plan_qa",
  "title": "今天饮食怎么替换"
}
```

### 8.2 发送消息

`POST /ai/conversations/:conversationId/messages`

#### 请求体

```json
{
  "content": "今天食堂没有鸡胸肉怎么办？",
  "context": {
    "dailyPlanId": "uuid",
    "dietPlanId": "uuid",
    "trainingPlanId": "uuid"
  }
}
```

#### 响应体

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "conversationId": "uuid",
    "userMessage": {
      "id": "uuid",
      "role": "user",
      "content": "今天食堂没有鸡胸肉怎么办？"
    },
    "assistantMessage": {
      "id": "uuid",
      "role": "assistant",
      "content": "可以优先换成瘦牛肉、鱼肉或鸡蛋，核心是保住蛋白摄入。",
      "safetyFlags": []
    }
  }
}
```

### 8.3 获取历史消息

`GET /ai/conversations/:conversationId/messages`

## 9. 商品接口

### 9.1 获取商品列表

`GET /products`

#### Query

- `category`
- `sceneTag`
- `targetTag`
- `status`（管理端使用）

### 9.2 获取商品详情

`GET /products/:id`

## 10. 运营后台接口建议

本阶段只定义，不实现业务代码。建议后续补充：

1. `POST /admin/diet-templates`
2. `POST /admin/training-templates`
3. `POST /admin/products`
4. `PATCH /admin/products/:id`
5. `GET /admin/dashboard/metrics`

## 11. 接口与数据库映射关系

| 接口模块 | 核心表 |
| --- | --- |
| 认证 | `users`, `auth_accounts`, `login_codes` |
| 建档 | `user_profiles`, `body_metrics` |
| 今日页 | `daily_plans`, `diet_plans`, `training_plans`, `check_ins` |
| 打卡 | `check_ins`, `body_metrics` |
| 周复盘 | `weekly_reviews`, `check_ins` |
| AI | `ai_conversations`, `ai_messages`, `knowledge_documents`, `knowledge_embeddings` |
| 商品 | `product_categories`, `products` |
