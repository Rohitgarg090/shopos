export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    const firmId = req.headers.get('x-firm-id');

    if (!token || !firmId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, via, includeHistory } = await req.json();

    if (!paymentId || !via) {
      return Response.json(
        { error: 'Payment ID and delivery method required' },
        { status: 400 }
      );
    }

    // Fetch payment details
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (payError || !payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Fetch bill details
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', payment.billId)
      .single();

    if (billError || !bill) {
      return Response.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Fetch customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', bill.customerId)
      .single();

    // Calculate outstanding balance
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('billId', bill.id);

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = bill.total - totalPaid;

    // Build receipt message
    const receiptDate = new Date(payment.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const receiptMessage = `✅ Payment Received

Amount: Rs. ${payment.amount.toFixed(2)}
Date: ${receiptDate}
Invoice #: ${bill.invoiceNo || bill.id.substring(0, 8).toUpperCase()}
Mode: ${payment.mode}${payment.upiRef ? ` (${payment.upiRef})` : ''}${payment.chequeNo ? ` (Cheque #${payment.chequeNo})` : ''}

Outstanding Balance: Rs. ${Math.max(0, balance).toFixed(2)}

Thank you for your business!`;

    let result = {
      success: true,
      message: receiptMessage,
      sent: false,
      via,
    };

    // Send via requested channel
    if (via === 'whatsapp' || via === 'both') {
      try {
        // Use existing WhatsApp send infrastructure
        const whatsappRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-firm-id': firmId,
            },
            body: JSON.stringify({
              phone: customer?.phone || bill.customerPhone,
              message: receiptMessage,
              type: 'whatsapp',
            }),
          }
        );

        if (whatsappRes.ok) {
          result.sentWhatsapp = true;
          console.log('[send-payment-receipt] WhatsApp sent successfully');
        } else {
          const errData = await whatsappRes.json();
          console.warn('[send-payment-receipt] WhatsApp send failed:', errData);
          result.whatsappError = errData.error || 'WhatsApp send failed';
        }
      } catch (err) {
        console.error('[send-payment-receipt] WhatsApp error:', err);
        result.whatsappError = err.message;
      }
    }

    if (via === 'email' || via === 'both') {
      try {
        // Use existing email send infrastructure
        const emailBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1B5E8A; color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px; }
    .amount { font-size: 24px; font-weight: bold; color: #2E6B1F; margin: 15px 0; }
    .footer { margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Payment Receipt</h2>
    </div>
    <div class="content">
      <p>Dear ${customer?.name || bill.customerName},</p>
      <p>Thank you for your payment. Here are the details:</p>

      <div class="amount">Rs. ${payment.amount.toFixed(2)}</div>

      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Date: ${receiptDate}</li>
        <li>Invoice #: ${bill.invoiceNo || bill.id.substring(0, 8).toUpperCase()}</li>
        <li>Mode: ${payment.mode}${payment.upiRef ? ` (${payment.upiRef})` : ''}${payment.chequeNo ? ` - Cheque #${payment.chequeNo}` : ''}</li>
        <li>Outstanding Balance: Rs. ${Math.max(0, balance).toFixed(2)}</li>
      </ul>

      <p>Thank you for your business!</p>
    </div>
    <div class="footer">
      <p>This is an automated receipt. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

        const emailRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-invoice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-firm-id': firmId,
            },
            body: JSON.stringify({
              email: customer?.email || bill.customerEmail,
              subject: `Payment Receipt - Invoice #${bill.invoiceNo || bill.id.substring(0, 8)}`,
              html: emailBody,
            }),
          }
        );

        if (emailRes.ok) {
          result.sentEmail = true;
          console.log('[send-payment-receipt] Email sent successfully');
        } else {
          const errData = await emailRes.json();
          console.warn('[send-payment-receipt] Email send failed:', errData);
          result.emailError = errData.error || 'Email send failed';
        }
      } catch (err) {
        console.error('[send-payment-receipt] Email error:', err);
        result.emailError = err.message;
      }
    }

    result.sent = result.sentWhatsapp || result.sentEmail;

    return Response.json(result);
  } catch (error) {
    console.error('[send-payment-receipt] Error:', error);
    return Response.json(
      { error: 'Failed to send receipt' },
      { status: 500 }
    );
  }
}
