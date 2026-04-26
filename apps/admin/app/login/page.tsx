import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-sand px-4 py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[40px] border border-black/8 bg-[linear-gradient(135deg,rgba(24,32,30,0.96),rgba(47,122,87,0.92))] p-8 text-sand shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-sand/60">CampusFit AI</p>
          <h1 className="mt-6 max-w-xl font-serif text-5xl leading-tight">运营后台 MVP</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-sand/78">
            本轮聚焦登录、模板管理、商品管理、用户反馈和基础数据总览。界面按运营协作流设计，避免做重 BI 和复杂权限系统。
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-sand/55">饮食模板</p>
              <p className="mt-3 text-2xl font-semibold">列表 / 详情 / 编辑</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-sand/55">训练模板</p>
              <p className="mt-3 text-2xl font-semibold">规则结构化管理</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-sand/55">商品 / 反馈</p>
              <p className="mt-3 text-2xl font-semibold">轻量运营闭环</p>
            </div>
          </div>
        </section>
        <section className="rounded-[36px] border border-black/8 bg-white/88 p-8 shadow-panel backdrop-blur lg:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-black/45">Admin Sign In</p>
          <h2 className="mt-4 font-serif text-4xl text-ink">进入运营后台</h2>
          <p className="mt-4 text-sm leading-7 text-black/55">
            登录成功后进入基础数据总览。当前为本地 mock 鉴权，接口结构保持统一响应格式，方便后续替换正式后端。
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="rounded-2xl border border-black/6 bg-black/[0.03] px-4 py-6 text-sm text-black/45">正在加载登录模块...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
