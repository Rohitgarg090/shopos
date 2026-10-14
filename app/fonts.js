import { Syne, DM_Sans } from 'next/font/google';

// Self-hosted by Next.js (no request to Google from the visitor's browser, no layout shift)
export const syne = Syne({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-syne', display: 'swap' });
export const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-dm', display: 'swap' });
