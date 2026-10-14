import Link from 'next/link';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f4f1', fontFamily: 'system-ui, sans-serif', color: '#0a0a0f' }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 28 }}>shop<span style={{ color: '#2563eb' }}>os</span></div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: '#2563eb' }}>404</div>
        <h1 style={{ fontSize: 22, margin: '14px 0 8px' }}>This page doesn&apos;t exist</h1>
        <p style={{ color: '#55556a', fontSize: 15, lineHeight: 1.6, margin: '0 0 26px' }}>The link may be old or mistyped. Head back to the homepage, or sign in to your account.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ background: '#0a0a0f', color: '#fff', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Go to homepage</Link>
          <Link href="/auth?mode=login" style={{ border: '1px solid #c9c9d2', color: '#0a0a0f', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </div>
        <p style={{ marginTop: 26, fontSize: 13, color: '#55556a' }}>Need help? <a href="mailto:info@shopos.co.in" style={{ color: '#1d4ed8' }}>info@shopos.co.in</a></p>
      </div>
    </main>
  );
}
