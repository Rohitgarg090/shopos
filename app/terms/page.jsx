import Link from 'next/link';
import LegalPage, { H2, P, UL, Mail, operator } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms for using ShopOS billing, inventory and accounting software.',
  alternates: { canonical: '/terms' },
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" intro={`These terms are an agreement between you and ${operator()} for the use of ${SITE.name}. Please read them before creating an account.`}>
      <H2>1. The service</H2>
      <P>{SITE.name} is online software for billing, inventory, accounts, labels and GST documents. Features available to you depend on your plan. We may improve, change or remove features over time; we will give reasonable notice before removing a feature you pay for.</P>

      <H2>2. Your account</H2>
      <UL items={[
        'You must be at least 18 and able to enter a contract under Indian law. If you use ShopOS for a business, you confirm you are allowed to act for it.',
        'Keep your password safe. You are responsible for everything done through your account and by the team members you invite.',
        'Give accurate details, including your firm’s GSTIN and address, and keep them up to date.',
      ]} />

      <H2>3. Your data and your responsibilities</H2>
      <P>You own the data you enter. You give us permission to store and process it only to provide the service to you (see our <Link href="/privacy" style={{ color: '#1d4ed8' }}>Privacy Policy</Link>).</P>
      <P>{SITE.name} is a tool, not tax or legal advice. You are responsible for checking invoices, tax rates, HSN codes, place of supply, E-Way Bills, E-Invoices and returns before you issue or file them, and for meeting your obligations under GST and other laws. Results from AI scanning can contain mistakes — always review them before saving.</P>

      <H2>4. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL items={[
        'use the service for fake invoices, tax evasion, fraud or any unlawful purpose;',
        'send spam or messages people have not agreed to receive through email, WhatsApp or SMS features;',
        'try to access other users’ data, break or overload the service, or reverse-engineer it;',
        'resell or share access to the service outside your own business without our written permission.',
      ]} />
      <P>We may suspend or close accounts that break these terms, after notice where reasonably possible.</P>

      <H2>5. Plans, trial and payment</H2>
      <UL items={[
        'New accounts get a 14-day trial with all features. After the trial, the account continues on the Free plan unless you buy a paid plan.',
        'Paid plans (Business 4 and Business 10) are billed yearly in advance through Razorpay. The current prices are shown on our website and at checkout.',
        'Plans do not renew automatically. When a paid plan ends, the account moves to the Free plan; your data stays available, but paid-only features (such as AI scanning, E-Way Bill and E-Invoice) stop working until you renew.',
        <>Refunds are covered by our <Link href="/refund-policy" style={{ color: '#1d4ed8' }}>Refund Policy</Link>.</>,
      ]} />

      <H2>6. Third-party services</H2>
      <P>Some features depend on other providers: the GST portals and our GST Suvidha Provider for E-Way Bill and E-Invoice, Google Gemini for AI scanning, Razorpay for payments, and email, WhatsApp and SMS providers. Their availability and rules are outside our control, and their own terms may apply.</P>

      <H2>7. Availability and support</H2>
      <P>We work to keep {SITE.name} available and your data backed up, but we do not promise uninterrupted or error-free service. Planned maintenance will be kept short. Support is available by email at <Mail />.</P>

      <H2>8. Limitation of liability</H2>
      <P>To the extent allowed by law, {SITE.name} is provided “as is”. We are not liable for indirect or consequential losses, such as lost profits, penalties or interest charged to you, or lost data you could have exported. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.</P>

      <H2>9. Ending your use</H2>
      <P>You can stop using {SITE.name} at any time and ask us to delete your account. Please export your records first. We may end the service for an account that breaks these terms, or if we stop offering the service, with at least 30 days’ notice and a chance to export your data.</P>

      <H2>10. Governing law</H2>
      <P>These terms are governed by the laws of India. Disputes will be handled by the courts having jurisdiction over our registered office{SITE.address ? ` (${SITE.address})` : ''}.</P>

      <H2>11. Changes and contact</H2>
      <P>We may update these terms; the “Last updated” date shows the current version, and we will tell you about important changes. Questions: <Mail />.</P>
    </LegalPage>
  );
}
