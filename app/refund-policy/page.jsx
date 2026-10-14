import LegalPage, { H2, P, UL, Mail } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Cancellation & Refund Policy',
  description: 'Free trial, cancellation and refund terms for ShopOS subscription plans.',
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicy() {
  return (
    <LegalPage title="Cancellation & Refund Policy" intro={`${SITE.name} is software delivered online — there are no physical goods or shipping. This page explains trials, cancellations and refunds for paid plans.`}>
      <H2>1. Try before you pay</H2>
      <P>Every new account gets a 14-day free trial with all features. No card is needed, so nothing is charged during or after the trial. A Free plan is also available at no cost.</P>

      <H2>2. Cancelling</H2>
      <P>Paid plans are bought for one year and do not renew automatically, so there is nothing to cancel to stop future charges. If you no longer want the plan, simply don’t renew it; your account moves to the Free plan when the year ends.</P>

      <H2>3. Refunds</H2>
      <UL items={[
        <><strong>Within 7 days of payment:</strong> if ShopOS isn’t right for you, email us from your registered address and we will refund the full amount.</>,
        <><strong>Duplicate or wrong charges:</strong> if you were charged twice or charged by mistake, we refund the extra amount in full.</>,
        <><strong>After 7 days:</strong> payments for the current year are not refundable, but you keep full access until the plan ends.</>,
      ]} />

      <H2>4. How refunds are paid</H2>
      <P>Approved refunds are sent to the original payment method through Razorpay within 5–7 working days of approval. Your bank may take a few more days to show the credit.</P>

      <H2>5. Contact</H2>
      <P>Email <Mail />{SITE.phone ? <> or call {SITE.phone}</> : null} with your registered email address and the Razorpay payment ID shown on your receipt.</P>
    </LegalPage>
  );
}
