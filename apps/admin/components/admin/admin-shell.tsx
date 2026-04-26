"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { adminNavigation } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:32px_32px] opacity-60" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(circle_at_top_left,rgba(47,122,87,0.24),transparent_42%),radial-gradient(circle_at_top_right,rgba(24,32,30,0.14),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[36px] border border-black/8 bg-[#f7f2ea]/90 p-6 shadow-panel backdrop-blur lg:flex lg:flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/45">CampusFit AI</p>
            <h1 className="mt-3 font-serif text-3xl text-ink">运营后台</h1>
            <p className="mt-3 text-sm leading-6 text-black/55">
              聚焦模板、商品和基础运营数据，围绕 MVP 闭环保持轻量可执行。
            </p>
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {adminNavigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[22px] px-4 py-3 text-sm transition",
                    active ? "bg-ink text-sand" : "text-ink hover:bg-white/70",
                  )}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className={cn("mt-1 text-xs", active ? "text-sand/70" : "text-black/45")}>{item.status}</div>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="rounded-[20px] border border-black/8 px-4 py-3 text-left text-sm text-ink transition hover:bg-white/70"
            onClick={() => {
              document.cookie = "campusfit_admin_session=; path=/; max-age=0";
              router.push("/login");
              router.refresh();
            }}
          >
            退出登录
          </button>
        </aside>
        <main className="relative flex-1 py-2">
          <div className="lg:hidden">
            <div className="mb-4 rounded-[28px] border border-black/8 bg-white/85 p-4 shadow-panel">
              <div className="flex gap-2 overflow-x-auto">
                {adminNavigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "whitespace-nowrap rounded-full px-4 py-2 text-sm",
                        active ? "bg-ink text-sand" : "bg-sand text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
