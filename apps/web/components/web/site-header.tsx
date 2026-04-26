'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_BRAND_DESCRIPTION, APP_BRAND_MONOGRAM, APP_BRAND_NAME } from '@/lib/brand';

const navigation = [
  { href: '/today', label: '今日执行' },
  { href: '/check-in', label: '打卡' },
  { href: '/review', label: '周复盘' },
  { href: '/assistant', label: 'AI 助手' },
  { href: '/diet', label: '饮食计划' },
  { href: '/account', label: '个人中心' },
  { href: '/privacy', label: '隐私政策' },
  { href: '/terms', label: '用户协议' },
  { href: '/data-deletion', label: '数据删除' },
  { href: '/onboarding', label: '建档向导' },
  { href: '/login', label: '登录' },
];

const dashboardRoutes = new Set(['/today', '/diet', '/check-in', '/review', '/account']);

export function SiteHeader() {
  const pathname = usePathname();

  if (dashboardRoutes.has(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3 text-forest">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-forest/20 bg-white text-sm font-semibold">
            {APP_BRAND_MONOGRAM}
          </span>
          <span>
            <span className="block text-xs uppercase tracking-[0.32em] text-moss">{APP_BRAND_NAME}</span>
            <span className="block font-serif text-lg">{APP_BRAND_DESCRIPTION}</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition hover:bg-white hover:text-forest"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

