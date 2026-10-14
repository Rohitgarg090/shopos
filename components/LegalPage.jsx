import Link from 'next/link';
import { SITE } from '@/lib/site';

const C = { ink: '#0a0a0f', body: '#2e2e3a', muted: '#55556a', line: '#e4e2dc', bg: '#f5f4f1', accent: '#1d4ed8' };

export const LEGAL_LINKS = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/refund-policy', 'Refund Policy'],
  ['/contact', 'Contact'],
];

// Business identity line used in the legal text: "ShopOS (operated by X, address)" when the details are filled in lib/site.js
export const operator = () =>
  SITE.legalName ? `${SITE.name}, operated by ${SITE.legalName}${SITE.address ? `, ${SITE.address}` : ''}` : SITE.name;

export function H2({ children }) {
  return <h2 style={{ fontSize: 19, fontWeight: 700, color: C.ink, margin: '34px 0 10px', letterSpacing: -0.2 }}>{children}</h2>;
}
export function P({ children }) {
  return <p style={{ margin: '0 0 12px' }}>{children}</p>;
}
export function UL({ items }) {
  return <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>{items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}</ul>;
}
export const Mail = () => <a href={`mailto:${SITE.email}`} style={{ color: C.accent }}>{SITE.email}</a>;

export default function LegalPage({ title, intro, children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.body, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: 15.5, lineHeight: 1.7 }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link href="/" style={{ fontSize: 22, fontWeight: 800, color: C.ink, textDecoration: 'none', letterSpacing: -0.5 }}>shop<span style={{ color: '#2563eb' }}>os</span></Link>
          <Link href="/auth?mode=signup" style={{ background: C.ink, color: '#fff', padding: '8px 16px', borderRadius: 9, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Start free trial</Link>
        </div>
      </header>
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '36px 16px 56px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 800, color: C.ink, margin: 0, letterSpacing: -0.6 }}>{title}</h1>
        <div style={{ fontSize: 13.5, color: C.muted, margin: '8px 0 22px' }}>Last updated: {SITE.lastUpdated}</div>
        {intro && <p style={{ fontSize: 16.5, color: C.ink, margin: '0 0 8px' }}>{intro}</p>}
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 'clamp(18px, 4vw, 34px)', marginTop: 18 }}>{children}</div>
      </main>
      <footer style={{ borderTop: `1px solid ${C.line}`, background: '#fff' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 14, alignItems: 'center' }}>
          {LEGAL_LINKS.map(([href, label]) => <Link key={href} href={href} style={{ color: C.muted, textDecoration: 'none' }}>{label}</Link>)}
          <span style={{ marginLeft: 'auto', color: C.muted }}>© {new Date().getFullYear()} {SITE.legalName || SITE.name}</span>
        </div>
      </footer>
    </div>
  );
}
