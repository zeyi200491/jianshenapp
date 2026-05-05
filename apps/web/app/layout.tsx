import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { SiteHeader } from '@/components/web/site-header';
import { APP_BRAND_DESCRIPTION, APP_BRAND_NAME, getBrandTitle } from '@/lib/brand';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://campusfit.ai'),
  title: {
    default: getBrandTitle('训练饮食执行助手'),
    template: `%s · ${APP_BRAND_NAME}`,
  },
  description: `${APP_BRAND_NAME}${APP_BRAND_DESCRIPTION}——AI驱动的大学健身饮食执行助手，提供个性化训练计划与饮食建议。`,
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: APP_BRAND_NAME,
    title: `${APP_BRAND_NAME}——AI训练饮食执行助手`,
    description: 'AI驱动的大学生健身饮食执行助手，提供个性化训练计划与饮食建议。',
  },
  twitter: {
    card: 'summary',
    title: APP_BRAND_NAME,
    description: 'AI驱动的大学生健身饮食执行助手',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </head>
      <body>
        <div className="min-h-screen">
          <a href="#main-content" className="skip-link">
            跳到主要内容
          </a>
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}

