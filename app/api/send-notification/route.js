import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

function cleanMobile(mobile) {
  if (!mobile) return '';
  let cleaned = mobile.replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

const TEMPLATES = {
  invoice: (v) => `Dear ${v.name}, your invoice ${v.invoiceNo} for Rs.${v.amount} from ${v.firmName} is ready. Pay online or contact us.`,
  payment: (v) => `Dear ${v.name}, payment of Rs.${v.amount} received. Thank you! Balance due: Rs.${v.balance}. - ${v.firmName}`,
  reminder: (v) => `Dear ${v.name}, friendly reminder: Rs.${v.balance} is outstanding on invoice ${v.invoiceNo}. Please pay at your earliest convenience. - ${v.firmName}`,
};

async function callMsg91(apiKey, endpoint, body) {
  try {
    const res = await fetch(`https://api.msg91.com${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MSG91 error: ${res.status} ${text}`);
    }
    return await res.json();
  } catch (e) {
    throw new Error(`MSG91 call failed: ${e.message}`);
  }
}

async function sendWhatsApp(apiKey, templateId, recipients) {
  if (!apiKey || !templateId) throw new Error('Missing WhatsApp config');
  const body = {
    authkey: apiKey,
    type: 'template',
    template_id: templateId,
    recipients: recipients.map(r => ({
      mobiles: r.mobile,
      ...(r.vars || {})
    }))
  };
  return await callMsg91(apiKey, '/api/wa/apiv2/message/', body);
}

async function sendSMS(apiKey, templateId, recipients) {
  if (!apiKey || !templateId) throw new Error('Missing SMS config');
  const body = {
    template_id: templateId,
    short_url: 1,
    realTimeResponse: 1,
    recipients: recipients.map(r => ({
      mobiles: r.mobile,
      ...(r.vars || {})
    }))
  };
  return await callMsg91(apiKey, '/api/v5/flow/', body);
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });

    const body = await req.json();
    const { type, channel, recipients, billId, customMessage } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients' }, { status: 400 });
    }

    // Load firm settings
    const { data: settings } = await c.sb.from('firm_settings')
      .select('msg91_key, msg91_sms_template, msg91_wa_template, name, mobile')
      .eq('firm_id', c.firmId)
      .single();

    if (!settings?.msg91_key) {
      return NextResponse.json({ error: 'MSG91 API key not configured' }, { status: 400 });
    }

    // Clean mobile numbers
    const cleanedRecipients = recipients.map(r => ({
      ...r,
      mobile: cleanMobile(r.mobile)
    })).filter(r => r.mobile.length > 0);

    if (cleanedRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid phone numbers' }, { status: 400 });
    }

    let sentChannel = 'failed';
    let error = '';
    let message = customMessage || '';

    // Try WhatsApp first
    if ((channel === 'whatsapp' || channel === 'both') && settings.msg91_wa_template) {
      try {
        await sendWhatsApp(settings.msg91_key, settings.msg91_wa_template, cleanedRecipients);
        sentChannel = 'whatsapp';
      } catch (e) {
        error = e.message;
        if (channel === 'whatsapp') {
          sentChannel = 'failed';
        }
      }
    }

    // Fall back to SMS if WhatsApp failed or requested
    if ((sentChannel === 'failed' || channel === 'sms') && settings.msg91_sms_template) {
      try {
        await sendSMS(settings.msg91_key, settings.msg91_sms_template, cleanedRecipients);
        sentChannel = sentChannel === 'failed' ? 'sms' : 'both';
        error = '';
      } catch (e) {
        error = e.message;
        if (sentChannel === 'failed') {
          sentChannel = 'failed';
        }
      }
    }

    // Log all notifications
    const logs = cleanedRecipients.map(r => ({
      firm_id: c.firmId,
      customer_id: r.customerId || null,
      bill_id: billId || null,
      type: type || 'broadcast',
      channel: sentChannel,
      mobile: r.mobile,
      message: message || (TEMPLATES[type]?.(r.vars) || ''),
      status: sentChannel === 'failed' ? 'failed' : 'sent',
      error: error || '',
      sent_at: new Date().toISOString()
    }));

    await c.sb.from('notification_log').insert(logs);

    return NextResponse.json({
      success: sentChannel !== 'failed',
      channel: sentChannel,
      count: cleanedRecipients.length,
      error: sentChannel === 'failed' ? error : ''
    });
  } catch (e) {
    console.error('[send-notification]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
