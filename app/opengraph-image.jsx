import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Social preview (WhatsApp, LinkedIn, X, Facebook) generated at build time
export default function OgImage() {
  const pill = t => (
    <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#e2e8f0', fontSize: 26 }}>{t}</div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: 'linear-gradient(135deg, #0a0a0f 0%, #13203d 60%, #1d4ed8 140%)', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>
          shop<span style={{ color: '#60a5fa' }}>os</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, lineHeight: 1.08, maxWidth: 980 }}>GST billing, inventory & accounts for wholesale traders</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#cbd5e1' }}>Invoices in seconds · AI supplier-bill scanning · Barcode labels</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {pill('E-Way Bill & E-Invoice')}{pill('Multi-firm')}{pill('Free plan')}
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 28, color: '#93c5fd', alignItems: 'center' }}>shopos.co.in</div>
        </div>
      </div>
    ),
    size,
  );
}
