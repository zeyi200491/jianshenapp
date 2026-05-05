import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/today', '/check-in', '/diet', '/review', '/account', '/assistant', '/onboarding'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://campusfit.ai'}/sitemap.xml`,
  };
}
