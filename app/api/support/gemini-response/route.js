import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const firmId = req.headers.get('x-firm-id');

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { error: 'Unauthorized', status: 401 };

  let firm = null;
  if (firmId) {
    const { data } = await supabase
      .from('firms')
      .select('*, firm_settings(*)')
      .eq('id', firmId)
      .single();
    firm = data;
  }

  return { user, firm, supabase };
}

export async function POST(req) {
  try {
    const { user, firm } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get Gemini key from firm settings
    const geminiKey = firm?.gemini_key ||
                      (firm?.firm_settings?.[0]?.gemini_key) ||
                      process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return Response.json(
        { error: 'Gemini API key not configured in firm settings' },
        { status: 400 }
      );
    }

    const { title, description, category, priority } = await req.json();

    if (!title || !description) {
      return Response.json(
        { error: 'Title and description required' },
        { status: 400 }
      );
    }

    // Call Gemini API
    const prompt = `You are a helpful customer support assistant.

A customer has submitted a support ticket with the following details:
- Title: ${title}
- Category: ${category}
- Priority: ${priority}
- Description: ${description}

Please provide:
1. A brief assessment of the issue
2. Suggested solution/response (2-3 sentences max)
3. Recommended priority level (low/medium/high/urgent)
4. Recommended category if different

Format your response as JSON with keys: assessment, suggestion, recommendedPriority, recommendedCategory`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return Response.json(
        { error: 'Failed to generate response: ' + (error.error?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      return Response.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    const content = data.candidates[0].content.parts[0].text;

    // Parse the response
    let parsed;
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          assessment: content,
          suggestion: 'Unable to parse structured response',
          recommendedPriority: priority,
          recommendedCategory: category,
        };
      }
    } catch (e) {
      parsed = {
        assessment: content,
        suggestion: content.substring(0, 200),
        recommendedPriority: priority,
        recommendedCategory: category,
      };
    }

    return Response.json({
      success: true,
      assessment: parsed.assessment || '',
      suggestion: parsed.suggestion || '',
      recommendedPriority: parsed.recommendedPriority || priority,
      recommendedCategory: parsed.recommendedCategory || category,
    });
  } catch (error) {
    console.error('Gemini response error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
