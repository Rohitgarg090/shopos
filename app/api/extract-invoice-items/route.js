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

    const { imageBase64, geminiKey, mimeType } = await req.json();

    if (!imageBase64 || !geminiKey) {
      return Response.json(
        { error: 'Image and Gemini key required' },
        { status: 400 }
      );
    }

    // Determine MIME type - use provided or detect from base64
    let finalMimeType = mimeType || 'image/jpeg';
    if (!mimeType && imageBase64) {
      if (imageBase64.startsWith('JVBERi')) finalMimeType = 'application/pdf';
      else if (imageBase64.startsWith('/9j/')) finalMimeType = 'image/jpeg';
      else if (imageBase64.startsWith('iVBORw0KGgo')) finalMimeType = 'image/png';
    }

    // Call Gemini Vision API
    const PROMPT = `You are a JSON extraction API for Indian wholesale clothing invoices.

OUTPUT ONLY RAW JSON — no markdown, no backticks, no code fences.
Start with { end with }.

Format:
{"supplier":"firm name","supplierGSTIN":"GSTIN","invoiceNo":"number","invoiceDate":"date","place":"city","subtotal":0,"discount":0,"discountPct":0,"cgst":0,"sgst":0,"igst":0,"invoiceTotal":0,"items":[{"articleNo":"","name":"","hsn":"","sizes":"","qty":1,"price":0,"gst":5,"cat":"Others","color":""}]}

RULES:
SUBTOTAL: Extract from "Subtotal" or "Net Amt" line in invoice (BEFORE discount). If not clear, calculate from items.
DISCOUNT: Extract actual discount amount from "Discount" line if shown.
CGST/SGST/IGST: Extract exact tax amounts from invoice. Copy from invoice totals.
INVOICE TOTAL: Extract final total from invoice bottom.
ARTICLE NO: Indian invoices often write "9925 PANSARI" — leading code is articleNo, rest is name.
HSN: Extract from HSN/SAC column if visible.
SIZES: Comma-separated if multiple (M,L,XL). "Free Size" if none shown.
GST: Must be 0/5/12/18/28 based on CGST+SGST rates.
CATEGORY: Kids/Girls/Men/Women/Jeans/Tops/Jackets/Hosiery/Woollen/Suits/Others.
PLACE: Extract city/state from "Place of Supply" field.
PRICE: Per unit line price, plain number, no Rs symbol. CRITICAL — extract from invoice line item column.
ITEMS: Extract EACH line item. Include ALL rows — do not skip any item.
CONFIDENCE: 0-1 score for each item.
If unclear, set confidence lower but still extract.`;

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash-latest'];
    let response = null;
    let lastError = null;

    // Try different models
    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inline_data: {
                          mime_type: finalMimeType,
                          data: imageBase64,
                        },
                      },
                      { text: PROMPT },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 8192,
                },
              }),
            }
          );

          if (res.status === 503 || res.status === 429) {
            lastError = `Model ${model} busy (${res.status}), trying next...`;
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (!res.ok) {
            const errData = await res.json();
            lastError = errData.error?.message || `HTTP ${res.status}`;
            console.error(`[extract-invoice] ${model} HTTP error:`, { status: res.status, error: errData });
            continue;
          }

          const data = await res.json();

          if (data.error) {
            lastError = data.error.message;
            console.error(`[extract-invoice] ${model} Gemini error:`, data.error);
            continue;
          }

          if (data.promptFeedback?.blockReason) {
            lastError = `Content blocked: ${data.promptFeedback.blockReason}`;
            console.error(`[extract-invoice] ${model} blocked:`, data.promptFeedback.blockReason);
            continue;
          }

          const rawText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (!rawText) {
            lastError = 'No response from model';
            console.error(`[extract-invoice] ${model} no response. Data:`, JSON.stringify(data).substring(0, 200));
            continue;
          }

          // Parse response
          try {
            // Clean up response
            let cleanedText = rawText
              .replace(/```json\s*/gi, '')
              .replace(/```\s*/gi, '')
              .trim();

            // Find JSON in response
            const jsonStart = cleanedText.indexOf('{');
            const jsonEnd = cleanedText.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
              throw new Error('No JSON found in response');
            }

            const jsonStr = cleanedText.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);

            // Validate response structure
            if (!parsed.items || !Array.isArray(parsed.items)) {
              parsed.items = [];
            }

            // Validate each item - support both field name conventions and normalize
            parsed.items = (parsed.items || []).map(item => ({
              articleNo: String(item.articleNo || '').trim(),
              name: String(item.name || '').trim(),
              hsn: String(item.hsn || '').trim(),
              sizes: String(item.sizes || item.size || 'Free Size').trim(),
              qty: Math.max(1, parseInt(item.qty || item.quantity) || 1),
              price: Math.max(0, parseFloat(item.price || item.unitPrice) || 0),
              gst: [0, 5, 12, 18, 28].includes(parseInt(item.gst)) ? parseInt(item.gst) : 5,
              cat: String(item.cat || item.category || 'Others').trim(),
              color: String(item.color || '').trim(),
              confidence: Math.min(1, Math.max(0, parseFloat(item.confidence) || 0.7))
            })).filter(item => item.name.length > 0);

            console.log('[extract-invoice] Successfully extracted', parsed.items.length, 'items');
            return Response.json({
              success: true,
              ...parsed,
              model,
            });
          } catch (parseError) {
            console.error('[extract-invoice] Parse error:', parseError.message);
            lastError = `Parse error: ${parseError.message}`;
            continue;
          }
        } catch (netError) {
          console.error('[extract-invoice] Network error:', netError.message);
          lastError = netError.message;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }

    // All models failed
    return Response.json(
      {
        error: 'Failed to extract items from image',
        details: lastError,
        items: [],
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('[extract-invoice] Error:', error);
    return Response.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
