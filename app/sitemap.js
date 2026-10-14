import { SITE } from '@/lib/site';

export default function sitemap() {
  const pages = [
    ['/', 1, 'weekly'],
    ['/request-demo', 0.7, 'monthly'],
    ['/contact', 0.5, 'yearly'],
    ['/privacy', 0.3, 'yearly'],
    ['/terms', 0.3, 'yearly'],
    ['/refund-policy', 0.3, 'yearly'],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({ url: SITE.url + path, lastModified: new Date('2026-10-15'), changeFrequency, priority }));
}
