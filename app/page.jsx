import Landing from '@/components/Landing';
import HomeGate from './home-gate';
import { SITE } from '@/lib/site';

export const metadata = {
  title: { absolute: `${SITE.name} — GST Billing, Inventory & Accounting for Wholesale Traders` },
  alternates: { canonical: '/' },
};

// Hide the landing page before first paint when this tab is signed in (the app loads instead).
const AUTH_HINT = `try{for(var i=0;i<sessionStorage.length;i++){if(/^sb-.+-auth-token$/.test(sessionStorage.key(i)||'')){document.documentElement.setAttribute('data-auth','1');break}}}catch(e){}`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE.url,
  description: SITE.description,
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Business 4', price: '1499', priceCurrency: 'INR' },
    { '@type': 'Offer', name: 'Business 10', price: '2499', priceCurrency: 'INR' },
  ],
};

export default function Page() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: AUTH_HINT }} />
      <style dangerouslySetInnerHTML={{ __html: 'html[data-auth="1"] .shopos-landing{display:none}html:not([data-auth="1"]) .auth-wait{display:none}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeGate>
        <div className="auth-wait flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
        <Landing />
      </HomeGate>
    </>
  );
}
