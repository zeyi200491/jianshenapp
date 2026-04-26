# CampusFit AI Service

独立 AI 服务，提供以下 MVP 能力：

1. 饮食计划解释
2. 训练计划解释
3. 一键改计划
4. 基础 RAG 问答
5. 规则引擎与 LLM 边界说明

## 目录

```text
services/ai-service
├─ app
│  ├─ api
│  ├─ core
│  ├─ knowledge
│  ├─ prompts
│  └─ services
├─ tests
├─ .env.example
└─ pyproject.toml
```

## 运行

```bash
cd services/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8100
```

## 环境变量

见 [`.env.example`](E:\Ai jjfajgsw\jianshenapp\services\ai-service\.env.example)。

默认使用 `mock` 提供方，不依赖外部模型也能跑通 MVP。

## 主要接口

1. `GET /health`
2. `GET /api/v1/boundary`
3. `POST /api/v1/diet-plans/explain`
4. `POST /api/v1/training-plans/explain`
5. `POST /api/v1/plans/adjust`
6. `POST /api/v1/rag/ask`
