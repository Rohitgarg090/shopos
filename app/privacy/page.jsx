import LegalPage, { H2, P, UL, Mail, operator } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How ShopOS collects, uses, stores and protects your account and business data.',
  alternates: { canonical: '/privacy' },
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" intro={`This policy explains what data ${SITE.name} collects, why, who it is shared with, and the choices you have. It is written for the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.`}>
      <P>{operator()} (“{SITE.name}”, “we”, “us”) provides online billing, inventory and accounting software at {SITE.url.replace('https://', '')}. By creating an account or using the website you agree to this policy.</P>

      <H2>1. Data we collect</H2>
      <UL items={[
        <><strong>Account details</strong> — your name, email address and password (stored only as a secure hash by our authentication provider), and the firms you create or join.</>,
        <><strong>Business data you enter</strong> — firm details (GSTIN, address, bank details, logo), customers, suppliers, products, invoices, payments, returns, ledgers, bank statements and supplier bills you upload.</>,
        <><strong>GST portal API credentials</strong> — if you enable E-Way Bill or E-Invoice, the API username and password for your firm. They are never shown back in the browser and are used only to file documents you ask us to file.</>,
        <><strong>Payment information</strong> — for subscriptions, payments are processed by Razorpay. We receive the payment status and reference number; we never see or store your card, UPI or bank login details.</>,
        <><strong>Demo requests</strong> — name, email, phone number, city and company name you submit on the demo form.</>,
        <><strong>Usage data</strong> — anonymous page-view statistics (pages visited, country, device type) without cookies, and server logs (IP address, time, error details) kept for security and troubleshooting.</>,
      ]} />

      <H2>2. How we use it</H2>
      <UL items={[
        'To provide the service: create invoices, keep stock and accounts, print labels, send documents you choose to send.',
        'To file E-Way Bills and E-Invoices on the government portal when you request it.',
        'To read supplier bills and bank statements you upload, using AI (see section 4).',
        'To manage your plan, process payments and send account emails (sign-up codes, password reset, receipts).',
        'To respond to demo requests and support queries.',
        'To keep the service secure, prevent abuse and fix problems.',
      ]} />
      <P>We do not sell your data, use it for advertising, or share your business data with other {SITE.name} users. Each firm’s data is visible only to the members of that firm.</P>

      <H2>3. Your customers’ and suppliers’ data</H2>
      <P>Details of your customers and suppliers (names, phone numbers, GSTINs, addresses, amounts) are entered by you and processed by us on your behalf, only to provide the service to you. You are responsible for having a lawful reason to record and share that information, for example when you send an invoice to a customer by email or WhatsApp.</P>

      <H2>4. Service providers we use</H2>
      <P>We share data with these providers only as needed to run the service:</P>
      <UL items={[
        <><strong>Supabase</strong> — database, file storage and sign-in.</>,
        <><strong>Vercel</strong> — website hosting and anonymous, cookie-free page-view analytics.</>,
        <><strong>Razorpay</strong> — subscription payments.</>,
        <><strong>Google (Gemini API)</strong> — reading supplier bills and statements you upload for AI scanning. Images are sent using the Gemini API key entered for your firm.</>,
        <><strong>Quicko Infosoft (Sandbox), a GST Suvidha Provider</strong> — filing E-Way Bills and E-Invoices with the government portals.</>,
        <><strong>Resend</strong> — sending emails; <strong>Twilio / MSG91</strong> — sending WhatsApp and SMS messages, when you use those features.</>,
      ]} />
      <P>Some of these providers store or process data on servers outside India. We may also disclose data when required by law or by a government authority.</P>

      <H2>5. Cookies and storage</H2>
      <P>{SITE.name} does not use advertising or tracking cookies. When you sign in, your session is kept in your browser’s session storage and ends when you close the tab. The website remembers small preferences (such as label size) in your browser’s local storage. Razorpay sets its own cookies only when you open the payment window.</P>

      <H2>6. Security</H2>
      <P>Data is sent over HTTPS and stored with our hosting providers, who encrypt it at rest. Access is limited by firm membership rules in the database. No system is perfectly secure; if we become aware of a breach affecting your personal data we will inform you and the authorities as required by law.</P>

      <H2>7. How long we keep data</H2>
      <P>We keep your data while your account is active. If you ask us to delete your account, we delete it within 30 days, except records we must keep by law (for example, payment and tax records). Backups are overwritten on a rolling basis. Remember that you may need to keep your own business records for GST purposes — please export them before deleting your account.</P>

      <H2>8. Your rights</H2>
      <P>You can access and correct most of your data directly in the app. You can also ask us to: give you a summary of the personal data we hold about you, correct or delete it, withdraw consent, or nominate another person to exercise these rights. Email <Mail /> from your registered email address.</P>

      <H2>9. Children</H2>
      <P>{SITE.name} is a business tool and is not meant for anyone under 18.</P>

      <H2>10. Grievance Officer and contact</H2>
      <P>
        {SITE.grievanceOfficer ? <>Grievance Officer: <strong>{SITE.grievanceOfficer}</strong>. </> : null}
        For privacy questions or complaints, email <Mail />{SITE.phone ? <> or call {SITE.phone}</> : null}. We acknowledge complaints within 48 hours and aim to resolve them within 30 days.
        {SITE.address ? <> Postal address: {SITE.address}.</> : null}
      </P>

      <H2>11. Changes to this policy</H2>
      <P>We may update this policy. The “Last updated” date above shows the latest version; for significant changes we will notify you by email or in the app.</P>
    </LegalPage>
  );
}
