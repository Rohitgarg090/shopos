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
    console.log('[MSG91] Calling endpoint:', endpoint);
    console.log('[MSG91] Body:', JSON.stringify({...body, authkey: '***'}, null, 2));

    const res = await fetch(`https://api.msg91.com${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: apiKey },
      body: JSON.stringify(body)
    });

    console.log('[MSG91] Response status:', res.status);

    if (!res.ok) {
      const text = await res.text();
      console.log('[MSG91] Error response:', text);
      throw new Error(`MSG91 error: ${res.status} ${text}`);
    }

    const result = await res.json();
    console.log('[MSG91] Success response:', JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.log('[MSG91] Exception:', e.message);
    throw new Error(`MSG91 call failed: ${e.message}`);
  }
}

async function sendWhatsApp(apiKey, templateId, recipients, imageBase64 = null) {
  if (!apiKey) throw new Error('Missing WhatsApp API key');

  // If image is provided, send as media message (not template)
  if (imageBase64) {
    console.log('[sendWhatsApp] Sending media message with image');
    const body = {
      authkey: apiKey,
      type: 'media',
      recipients: recipients.map(r => ({
        mobiles: r.mobile,
        message: r.message || 'Check this out!'
      })),
      media: {
        type: 'image',
        url: `data:image/jpeg;base64,${imageBase64.substring(0, 50)}...` // Log partial URL for safety
      }
    };
    console.log('[sendWhatsApp] Body:', JSON.stringify({...body, media: {...body.media, url: '(base64 image data)'}}, null, 2));
    return await callMsg91(apiKey, '/api/wa/apiv2/message/', body);
  }

  // Template-based message (text only)
  if (!templateId) throw new Error('Missing WhatsApp template config');
  console.log('[sendWhatsApp] Sending template message');
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
    console.log('\n🔔 [send-notification] Starting POST request');
    const c = await ctx(req);
    console.log('[send-notification] Auth context:', c ? 'Valid' : 'Invalid');
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) {
      console.log('[send-notification] No firm selected');
      return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
    }

    const body = await req.json();
    console.log('[send-notification] Request body received:', { type: body.type, channel: body.channel, recipientCount: body.recipients?.length, hasImage: !!body.image, hasCustomMessage: !!body.customMessage });
    const { type, channel, recipients, billId, customMessage, image } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.log('[send-notification] Invalid or empty recipients');
      return NextResponse.json({ error: 'No recipients' }, { status: 400 });
    }

    console.log('[send-notification] Recipient details:', recipients.map(r => ({ mobile: r.mobile, name: r.name })));

    // Load firm settings
    console.log('[send-notification] Loading firm settings for firmId:', c.firmId);
    const { data: settings } = await c.sb.from('firm_settings')
      .select('msg91_key, msg91_sms_template, msg91_wa_template, name, mobile')
      .eq('firm_id', c.firmId)
      .single();

    console.log('[send-notification] Settings loaded:', {
      hasMsg91Key: !!settings?.msg91_key,
      hasWaTemplate: !!settings?.msg91_wa_template,
      hasSmsTemplate: !!settings?.msg91_sms_template,
      firmName: settings?.name
    });

    if (!settings?.msg91_key) {
      console.log('[send-notification] ❌ MSG91 API key not configured');
      return NextResponse.json({ error: 'MSG91 API key not configured' }, { status: 400 });
    }

    console.log('[send-notification] ✅ MSG91 API key found');

    // Clean mobile numbers
    console.log('[send-notification] Cleaning mobile numbers...');
    const cleanedRecipients = recipients.map(r => ({
      ...r,
      mobile: cleanMobile(r.mobile)
    })).filter(r => r.mobile.length > 0);

    console.log('[send-notification] Cleaned recipients:', cleanedRecipients.map(r => ({ mobile: r.mobile, name: r.name })));

    if (cleanedRecipients.length === 0) {
      console.log('[send-notification] ❌ No valid phone numbers after cleaning');
      return NextResponse.json({ error: 'No valid phone numbers' }, { status: 400 });
    }

    console.log('[send-notification] ✅ Valid recipients count:', cleanedRecipients.length);

    let sentChannel = 'failed';
    let error = '';
    let message = customMessage || '';

    // Try WhatsApp first
    console.log('[send-notification] Attempting WhatsApp send...');
    console.log('[send-notification] WhatsApp conditions:', {
      channelIsWhatsapp: channel === 'whatsapp' || channel === 'both',
      hasTemplate: !!settings.msg91_wa_template,
      hasImage: !!image
    });

    if ((channel === 'whatsapp' || channel === 'both') && (settings.msg91_wa_template || image)) {
      try {
        const recipientsWithMessage = cleanedRecipients.map(r => ({
          ...r,
          message: customMessage || ''
        }));
        console.log('[send-notification] Calling sendWhatsApp...');
        await sendWhatsApp(settings.msg91_key, settings.msg91_wa_template, recipientsWithMessage, image);
        sentChannel = 'whatsapp';
        console.log('[send-notification] ✅ WhatsApp sent successfully');
      } catch (e) {
        console.log('[send-notification] ❌ WhatsApp error:', e.message);
        error = e.message;
        if (channel === 'whatsapp') {
          sentChannel = 'failed';
        }
      }
    } else {
      console.log('[send-notification] ⚠️ WhatsApp skipped - conditions not met');
    }

    // Fall back to SMS if WhatsApp failed or requested
    console.log('[send-notification] Attempting SMS send...');
    console.log('[send-notification] SMS conditions:', {
      hasSmsTemplate: !!settings.msg91_sms_template,
      sentChannelIsFailed: sentChannel === 'failed',
      channelIsSms: channel === 'sms'
    });

    if ((sentChannel === 'failed' || channel === 'sms') && settings.msg91_sms_template) {
      try {
        console.log('[send-notification] Calling sendSMS...');
        await sendSMS(settings.msg91_key, settings.msg91_sms_template, cleanedRecipients);
        sentChannel = sentChannel === 'failed' ? 'sms' : 'both';
        error = '';
        console.log('[send-notification] ✅ SMS sent successfully');
      } catch (e) {
        console.log('[send-notification] ❌ SMS error:', e.message);
        error = e.message;
        if (sentChannel === 'failed') {
          sentChannel = 'failed';
        }
      }
    } else {
      console.log('[send-notification] ⚠️ SMS skipped - conditions not met');
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
    console.error('[send-notification] Error:', e);
    console.error('[send-notification] Stack:', e.stack);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
