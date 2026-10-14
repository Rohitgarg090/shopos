import './globals.css'
import { Analytics } from '@vercel/analytics/react';
import { SITE } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['GST billing software', 'wholesale billing software', 'inventory management', 'clothing wholesale software', 'barcode label printing', 'E-Way Bill', 'E-Invoice', 'Tally alternative', 'ShopOS'],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_IN',
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  formatDetection: { telephone: false },
  verification: { google: 'Sq-fxdYZYezQBJrepFQA0_vlO36BW-nz_1a9ONHYeEM' },   // Google Search Console
};

export const viewport = { themeColor: '#0a0a0f', width: 'device-width', initialScale: 1 };

// Razorpay's checkout script is loaded only when someone pays (lib/razorpay.js), not on every page.
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="margin-0 padding-0 bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
