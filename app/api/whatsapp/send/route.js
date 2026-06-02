import twilio from 'twilio';
import { validatePhoneNumber, sanitizeText, getSafeErrorMessage } from '@/lib/security';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

if (!accountSid || !authToken) {
  console.warn('[whatsapp/send] Twilio credentials not configured');
}

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user } : null;
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!accountSid || !authToken) {
      return Response.json(
        { error: 'Twilio not configured. Contact support.' },
        { status: 500 }
      );
    }

    const { customerNumber, invoiceNo, amount, firmName, pdfUrl } = await req.json();

    if (!customerNumber || !invoiceNo) {
      return Response.json(
        { error: 'Customer number and invoice number required' },
        { status: 400 }
      );
    }

    // Validate and clean phone number
    const phoneValidation = validatePhoneNumber(customerNumber);
    if (!phoneValidation.valid) {
      return Response.json(
        { error: phoneValidation.error },
        { status: 400 }
      );
    }

    const cleaned = phoneValidation.cleaned;

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Prepare message (sanitize firm name and invoice number)
    const safeFirmName = sanitizeText(firmName || 'Business');
    const safeInvoiceNo = sanitizeText(invoiceNo);
    const message = `📄 *Invoice from ${safeFirmName}*\n\n` +
                   `Invoice #${safeInvoiceNo}\n` +
                   `Amount: ₹${amount}\n\n` +
                   `Please find the invoice attached.\n` +
                   `Thank you for your business!`;

    console.log(`[whatsapp/send] Sending invoice ${invoiceNo} to ${cleaned}`);

    // Send message via Twilio WhatsApp
    const result = await client.messages.create({
      from: `whatsapp:${twilioWhatsappNumber}`,
      to: `whatsapp:${cleaned}`,
      body: message,
      // mediaUrl: pdfUrl ? [pdfUrl] : undefined, // Optional: attach PDF if URL provided
    });

    console.log(`[whatsapp/send] Message sent: ${result.sid}`);

    return Response.json({
      success: true,
      message: `Invoice sent to ${cleaned}`,
      customerNumber: cleaned,
      invoiceNo,
      messageSid: result.sid,
    });
  } catch (error) {
    console.error('[whatsapp/send] Error:', error.message);
    return Response.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
