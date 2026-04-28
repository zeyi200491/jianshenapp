'use client';

import Link from 'next/link';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { APP_BRAND_DESCRIPTION, APP_BRAND_MONOGRAM, APP_BRAND_NAME } from '@/lib/brand';

type NavItem = {
  href: string;
  label: string;
  icon: 'dashboard' | 'diet' | 'check' | 'review';
};

type DashboardShellProps = {
  currentPath: string;
  header: ReactNode;
  children: ReactNode;
  sidebarHint?: string;
  primaryCta?: {
    label: string;
    href: string;
  };
};

type DashboardCardProps = ComponentPropsWithoutRef<'section'> & {
  children: ReactNode;
};

type MetricPillProps = {
  label: string;
  value: string;
  accent?: boolean;
};

type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: 'blue' | 'teal' | 'soft';
  className?: string;
};

type CircleGaugeProps = {
  value: number;
  label: string;
  sublabel?: string;
  tone?: 'blue' | 'teal';
  size?: number;
};

type AccentGlyphKind =
  | 'spark'
  | 'strategy'
  | 'training'
  | 'calendar'
  | 'chevron-left'
  | 'chevron-right'
  | 'launch'
  | 'meal'
  | 'water'
  | 'steps'
  | 'highlight'
  | 'balance'
  | 'insight'
  | 'location';

type AccentGlyphProps = {
  kind: AccentGlyphKind;
  className?: string;
  strokeWidth?: number;
};

type AccentBadgeProps = {
  kind: AccentGlyphKind;
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
};

const navigation: NavItem[] = [
  { href: '/today', label: '仪表盘', icon: 'dashboard' },
  { href: '/diet', label: '饮食计划', icon: 'diet' },
  { href: '/check-in', label: '每日打卡', icon: 'check' },
  { href: '/review', label: '每周复盘', icon: 'review' },
];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function NavigationIcon({ icon, active }: { icon: NavItem['icon']; active: boolean }) {
  const base = active ? '#0f7ea5' : '#5a7087';

  if (icon === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={base} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (icon === 'diet') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={base} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v9" />
        <path d="M10 2v9" />
        <path d="M6 6h4" />
        <path d="M8 11v11" />
        <path d="M16 2c1.6 1.5 2 3.5 2 5.5V22" />
        <path d="M18 2c-1.6 1.5-2 3.5-2 5.5V22" />
      </svg>
    );
  }

  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={base} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.1 2.1 4.9-5.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={base} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
      <path d="M13 14h3" />
    </svg>
  );
}

function TopIcon({ type }: { type: 'spark' | 'bell' | 'user' }) {
  if (type === 'spark') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4" />
        <path d="M12 17v4" />
        <path d="m5.6 5.6 2.8 2.8" />
        <path d="m15.6 15.6 2.8 2.8" />
        <path d="M3 12h4" />
        <path d="M17 12h4" />
        <path d="m5.6 18.4 2.8-2.8" />
        <path d="m15.6 8.4 2.8-2.8" />
      </svg>
    );
  }

  if (type === 'bell') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.2" />
      <path d="M5.5 19.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  );
}

export function AccentGlyph({ kind, className, strokeWidth = 1.9 }: AccentGlyphProps) {
  const sharedProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const iconClassName = cx('h-5 w-5', className);

  if (kind === 'spark') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M12 2.5v4" />
        <path d="M12 17.5v4" />
        <path d="m5.8 5.8 2.8 2.8" />
        <path d="m15.4 15.4 2.8 2.8" />
        <path d="M2.5 12h4" />
        <path d="M17.5 12h4" />
        <path d="m5.8 18.2 2.8-2.8" />
        <path d="m15.4 8.6 2.8-2.8" />
      </svg>
    );
  }

  if (kind === 'strategy') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 7.5v4.5l3 2.5" />
        <path d="M7 5.5 5 3.5" />
        <path d="M17 5.5 19 3.5" />
      </svg>
    );
  }

  if (kind === 'training') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M3 10v4" />
        <path d="M6 8v8" />
        <path d="M18 8v8" />
        <path d="M21 10v4" />
        <path d="M8 12h8" />
        <path d="M6 8h2" />
        <path d="M6 16h2" />
        <path d="M16 8h2" />
        <path d="M16 16h2" />
      </svg>
    );
  }

  if (kind === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M7.5 3v4" />
        <path d="M16.5 3v4" />
        <path d="M3.5 10h17" />
        <path d="M8 14h3" />
        <path d="M13 14h3" />
      </svg>
    );
  }

  if (kind === 'chevron-left') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="m14.5 6.5-5 5.5 5 5.5" />
      </svg>
    );
  }

  if (kind === 'chevron-right') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="m9.5 6.5 5 5.5-5 5.5" />
      </svg>
    );
  }

  if (kind === 'launch') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M14 5h5v5" />
        <path d="m10 14 9-9" />
        <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
      </svg>
    );
  }

  if (kind === 'meal') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M5 5.5v5" />
        <path d="M8 5.5v5" />
        <path d="M5 8h3" />
        <path d="M6.5 10.5V19" />
        <path d="M15.5 5.5c1.8 1.6 2.2 3.7 2.2 5.9V19" />
        <path d="M15.5 5.5c-1.8 1.6-2.2 3.7-2.2 5.9" />
      </svg>
    );
  }

  if (kind === 'water') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M12 3.5c-2.4 3-5.5 6.5-5.5 10.1A5.5 5.5 0 0 0 12 19a5.5 5.5 0 0 0 5.5-5.4C17.5 10 14.4 6.5 12 3.5Z" />
        <path d="M9.3 13.5a2.7 2.7 0 0 0 2.7 2.6" />
      </svg>
    );
  }

  if (kind === 'steps') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M8 5.5c1.6 0 2.5 1.2 2.5 2.9S9.2 11 8 12.2c-1.4 1.3-3.5 2.1-3.5 4 0 1.4 1.2 2.3 2.9 2.3 2.2 0 3.8-1.4 4.8-3.2" />
        <path d="M16.2 4.5c1.8 0 3 1.3 3 3.2 0 2.1-1.7 3.4-3 4.8-1.1 1.1-1.8 2.3-1.8 3.7 0 1.6 1.2 2.8 3.1 2.8" />
      </svg>
    );
  }

  if (kind === 'highlight') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="m12 4 1.7 4.1 4.3 1.7-4.3 1.7L12 15.6l-1.7-4.1L6 9.8l4.3-1.7Z" />
        <path d="M18.5 4.5v2" />
        <path d="M18.5 9v2" />
      </svg>
    );
  }

  if (kind === 'balance') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M12 4.5v15" />
        <path d="M6 8.5h12" />
        <path d="m8.5 8.5-2.7 4.4a2.8 2.8 0 0 0 5.4 0Z" />
        <path d="m18.2 8.5-2.7 4.4a2.8 2.8 0 0 0 5.4 0Z" />
      </svg>
    );
  }

  if (kind === 'insight') {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
        <path d="M2.5 12s3.8-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.8 5.5-9.5 5.5S2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.4" />
        <path d="M18.5 5v2.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={iconClassName} {...sharedProps}>
      <path d="M12 20s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

export function AccentBadge({ kind, className, iconClassName, strokeWidth }: AccentBadgeProps) {
  return (
    <span aria-hidden="true" className={cx('grid place-items-center rounded-full', className)}>
      <AccentGlyph kind={kind} className={iconClassName} strokeWidth={strokeWidth} />
    </span>
  );
}

export function DashboardShell({ currentPath, header, children, sidebarHint = '今天还没有开始？', primaryCta }: DashboardShellProps) {
  const cta = primaryCta ?? { label: '开始训练', href: '/check-in' };
  const isAccountPath = currentPath === '/account';

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#f4f8fc] text-[#17324d]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col justify-between border-b border-[#d7e5f0] bg-[#eef6fd] px-5 py-6 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div>
            <Link href="/today" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0f7ea5] text-white shadow-[0_14px_32px_rgba(15,126,165,0.28)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m13 2-6 10h5l-1 10 6-10h-5z" />
                </svg>
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[#0f3554]">{APP_BRAND_NAME}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-[#4f88ab]">{APP_BRAND_DESCRIPTION}</p>
              </div>
            </Link>

            <nav className="mt-8 flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {navigation.map((item) => {
                const active = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      'flex min-w-fit items-center gap-3 rounded-[24px] px-4 py-3 text-sm font-medium transition',
                      active
                        ? 'bg-white text-[#0f6f96] shadow-[0_16px_30px_rgba(17,75,115,0.08)]'
                        : 'text-[#587086] hover:bg-white/70',
                    )}
                  >
                    <span className={cx('grid h-9 w-9 place-items-center rounded-full', active ? 'bg-[#e7f4fb]' : 'bg-transparent')}>
                      <NavigationIcon icon={item.icon} active={active} />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 space-y-5">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#dff2ff,#c9e9ff)] p-5 text-[#2e5977] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <p className="text-sm">{sidebarHint}</p>
              <Link
                href={cta.href}
                className="mt-4 flex items-center justify-center rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,126,165,0.32)] transition hover:translate-y-[-1px]"
              >
                {cta.label}
              </Link>
            </div>
            <div className="hidden lg:block">
              <Link
                href="/account"
                aria-current={isAccountPath ? 'page' : undefined}
                className={cx(
                  'inline-flex items-center gap-3 rounded-[22px] border px-4 py-3 text-sm transition',
                  isAccountPath
                    ? 'border-white/90 bg-white text-[#0f6f96] shadow-[0_14px_28px_rgba(17,75,115,0.1)]'
                    : 'border-transparent bg-white/70 text-[#5f7690] hover:border-white/80 hover:bg-white hover:text-[#0f7ea5]',
                )}
              >
                <span className={cx('grid h-9 w-9 place-items-center rounded-full', isAccountPath ? 'bg-[#e7f4fb]' : 'bg-[#edf4fa]')}>
                  <TopIcon type="user" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold text-[#17324d]">我的档案</span>
                  <span className="text-[11px] text-[#6f8498]">个人中心</span>
                </span>
              </Link>
            </div>
          </div>
        </aside>

        <section className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-3 lg:mb-7">
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,126,165,0.28)]"
            >
              <TopIcon type="spark" />
              AI 助手
            </Link>
            <Link
              href="/account"
              aria-label="个人中心"
              title="个人中心"
              aria-current={isAccountPath ? 'page' : undefined}
              className={cx(
                'inline-flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-[0_12px_24px_rgba(21,74,112,0.08)] transition',
                isAccountPath
                  ? 'border-[#b8dcee] bg-[#eaf6fd] text-[#0f6f96]'
                  : 'border-white/90 bg-white text-[#425f7b] hover:border-[#c9dfed] hover:text-[#0f7ea5]',
              )}
            >
              <span className={cx('grid h-9 w-9 place-items-center rounded-full', isAccountPath ? 'bg-white' : 'bg-[#edf4fa]')}>
                <TopIcon type="user" />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a94a8]">Account</span>
                <span className="text-sm font-semibold">我的档案</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="通知中心"
              title="通知中心即将上线"
              aria-disabled="true"
              disabled
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#61778f] shadow-[0_12px_24px_rgba(21,74,112,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TopIcon type="bell" />
            </button>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#17324d,#05080d)] text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffcd5c] shadow-[0_12px_26px_rgba(8,22,40,0.28)]">
              {APP_BRAND_MONOGRAM}
            </div>
          </div>
          <div className="space-y-6">{header}{children}</div>
        </section>
      </div>
    </main>
  );
}

export function DashboardCard({ children, className, ...rest }: DashboardCardProps) {
  return (
    <section {...rest} className={cx('rounded-[34px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_48px_rgba(25,60,94,0.08)] backdrop-blur', className)}>
      {children}
    </section>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0f7ea5]">{children}</p>;
}

export function MetricPill({ label, value, accent = false }: MetricPillProps) {
  return (
    <div className={cx('rounded-[28px] px-5 py-4', accent ? 'bg-[#0f7ea5] text-white' : 'bg-[#edf4fa] text-[#143753]')}>
      <p className={cx('text-xs font-medium tracking-[0.2em]', accent ? 'text-white/70' : 'text-[#6d879c]')}>{label}</p>
      <p className="mt-2 text-[18px] font-semibold">{value}</p>
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = 'blue', className }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(value, 0), max);
  const percentage = max === 0 ? 0 : (safeValue / max) * 100;
  const toneClass = tone === 'teal' ? 'bg-[#0b7a7c]' : tone === 'soft' ? 'bg-[#76c6ef]' : 'bg-[#0f7ea5]';

  return (
    <div className={cx('h-2.5 rounded-full bg-[#dce8f1]', className)}>
      <div className={cx('h-full rounded-full transition-[width]', toneClass)} style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function CircleGauge({ value, label, sublabel, tone = 'blue', size = 106 }: CircleGaugeProps) {
  const safeValue = Math.min(Math.max(value, 0), 100);
  const color = tone === 'teal' ? '#0b7a7c' : '#0f7ea5';
  const style = {
    background: `conic-gradient(${color} 0 ${safeValue}%, #dbe8f1 ${safeValue}% 100%)`,
    width: `${size}px`,
    height: `${size}px`,
  } satisfies CSSProperties;

  return (
    <div className="flex items-center gap-4">
      <div className="grid place-items-center rounded-full p-[8px]" style={style}>
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-[28px] font-semibold leading-none text-[#17324d]">{safeValue}</p>
            <p className="mt-1 text-[11px] text-[#72879a]">{label}</p>
          </div>
        </div>
      </div>
      {sublabel ? <p className="max-w-[180px] text-sm leading-6 text-[#5d7288]">{sublabel}</p> : null}
    </div>
  );
}

export function PanelTag({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'deep' }) {
  return (
    <span className={cx(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      tone === 'deep' ? 'bg-[#dff2ff] text-[#0f7ea5]' : 'bg-[#eef4f8] text-[#60778d]',
    )}>
      {children}
    </span>
  );
}

