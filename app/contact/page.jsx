import Link from 'next/link';
import LegalPage, { H2, P, Mail } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Contact us',
  description: 'Contact the ShopOS team for sales, support, billing or privacy questions.',
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  const row = (label, value) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', padding: '12px 0', borderBottom: '1px solid #e4e2dc' }}>
      <div style={{ width: 150, color: '#55556a' }}>{label}</div>
      <div style={{ flex: 1, minWidth: 200, color: '#0a0a0f', fontWeight: 500 }}>{value}</div>
    </div>
  );
  return (
    <LegalPage title="Contact us" intro="Questions about ShopOS, your plan or your account? We’re happy to help.">
      {row('Email', <Mail />)}
      {SITE.phone ? row('Phone', <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} style={{ color: '#1d4ed8' }}>{SITE.phone}</a>) : null}
      {SITE.legalName ? row('Business name', SITE.legalName) : null}
      {SITE.address ? row('Address', SITE.address) : null}
      {SITE.grievanceOfficer ? row('Grievance Officer', SITE.grievanceOfficer) : null}
      <H2>See it in action</H2>
      <P>Want a walkthrough for your shop? <Link href="/request-demo" style={{ color: '#1d4ed8' }}>Book a free demo</Link> and we’ll call you to fix a time.</P>
      <H2>Already a customer?</H2>
      <P>Sign in and use the <strong>Support</strong> button on your dashboard to raise a ticket, or email us from your registered address so we can find your account quickly.</P>
    </LegalPage>
  );
}
