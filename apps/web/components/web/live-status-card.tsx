import type { ReactNode } from 'react';
import { DashboardCard } from '@/components/web/dashboard-shell';

type LiveStatusTone = 'loading' | 'error' | 'success';

type LiveStatusCardProps = {
  tone: LiveStatusTone;
  children: ReactNode;
  className?: string;
};

const toneConfig: Record<
  LiveStatusTone,
  { ariaLive: 'polite' | 'assertive'; role: 'status' | 'alert'; className: string }
> = {
  loading: {
    ariaLive: 'polite',
    role: 'status',
    className: 'text-sm text-[#5d7288]',
  },
  error: {
    ariaLive: 'assertive',
    role: 'alert',
    className: 'border-[#ffd8d4] bg-[#fff2f1] text-sm text-[#a34d47]',
  },
  success: {
    ariaLive: 'polite',
    role: 'status',
    className: 'border-[#d5f1df] bg-[#eefbf3] text-sm text-[#1d6a49]',
  },
};

export function LiveStatusCard({ tone, children, className }: LiveStatusCardProps) {
  const config = toneConfig[tone];

  return (
    <DashboardCard
      aria-live={config.ariaLive}
      role={config.role}
      className={[config.className, 'whitespace-pre-line', className].filter(Boolean).join(' ')}
    >
      {children}
    </DashboardCard>
  );
}
