import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://campusfit.ai';

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/data-deletion`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ];
}
