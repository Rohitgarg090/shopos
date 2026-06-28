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
    const PROMPT = `You are an invoice item extraction AI. Extract items from the image.

RETURN ONLY VALID JSON, no markdown, no code fences, no explanation.

Output format:
{
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "unitPrice": 100,
      "confidence": 0.95
    }
  ],
  "extractedText": "Raw text from image",
  "rawImage": "Description of what's shown"
}

RULES:
- Extract each line item from the image
- "name": Product or item name (clean, no extra text)
- "quantity": Number of units (default 1 if not shown)
- "unitPrice": Price per unit (number only, no currency)
- "confidence": How confident you are (0-1, where 1 is very confident)
- Ignore headers, totals, invoice numbers - just extract line items
- If image is unclear, set confidence lower
- Return empty items array if no items found
- Support handwritten and printed text

Examples of valid responses:
{"items":[{"name":"Tea","quantity":5,"unitPrice":50,"confidence":0.9}]}
{"items":[{"name":"Milk","quantity":2,"unitPrice":60,"confidence":0.85},{"name":"Butter","quantity":1,"unitPrice":300,"confidence":0.95}]}
{"items":[],"extractedText":"Could not identify items","rawImage":"Blank or invalid image"}`;

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
            continue;
          }

          const data = await res.json();

          if (data.error) {
            lastError = data.error.message;
            continue;
          }

          if (data.promptFeedback?.blockReason) {
            lastError = `Content blocked: ${data.promptFeedback.blockReason}`;
            continue;
          }

          const rawText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (!rawText) {
            lastError = 'No response from model';
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

            // Validate each item
            parsed.items = parsed.items.filter(item => {
              item.name = String(item.name || '').trim();
              item.quantity = Math.max(1, parseInt(item.quantity) || 1);
              item.unitPrice = Math.max(0, parseFloat(item.unitPrice) || 0);
              item.confidence = Math.min(1, Math.max(0, parseFloat(item.confidence) || 0.7));
              return item.name.length > 0 && item.unitPrice > 0;
            });

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
