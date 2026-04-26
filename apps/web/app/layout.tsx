import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { SiteHeader } from '@/components/web/site-header';
import { APP_BRAND_DESCRIPTION, APP_BRAND_NAME, getBrandTitle } from '@/lib/brand';

export const metadata: Metadata = {
  title: getBrandTitle('公开网页'),
  description: `面向公开访问的 ${APP_BRAND_NAME}${APP_BRAND_DESCRIPTION}入口。`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
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

