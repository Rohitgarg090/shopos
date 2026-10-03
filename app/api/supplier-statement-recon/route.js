export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const PROMPT = `You are reading a SUPPLIER'S STATEMENT OF ACCOUNT (ledger) that a supplier sent to their customer.
In the supplier's books: DEBIT = sale invoice / debit note to the customer (customer owes more);
CREDIT = payment received from the customer, credit note, sales return, discount (customer owes less).

Return ONLY this JSON (no markdown):
{
 "supplierName": "name of the business that issued the statement",
 "customerName": "name of the party the statement is addressed to",
 "periodFrom": "YYYY-MM-DD or empty",
 "periodTo": "YYYY-MM-DD or empty",
 "openingBalance": {"amount": number, "side": "Dr" or "Cr"} or null,
 "closingBalance": {"amount": number, "side": "Dr" or "Cr"} or null,
 "lines": [
   {"date": "YYYY-MM-DD", "type": "invoice" | "payment" | "credit_note" | "debit_note" | "other",
    "ref": "invoice no / cheque no / voucher no exactly as printed",
    "description": "particulars as printed", "debit": number, "credit": number}
 ]
}
Rules:
- Include EVERY transaction row on every page, in order. Do NOT include opening balance, closing balance, page totals or grand total rows in "lines" — put opening/closing in their own fields.
- Each line has either debit or credit (the other is 0). Amounts are positive numbers without commas or currency symbols.
- "Dr" closing balance means the customer owes the supplier.
- Dates: convert DD-MM-YYYY / DD/MM/YY to YYYY-MM-DD (Indian day-first format).
- type "payment" for cheque/NEFT/RTGS/UPI/cash receipts; "credit_note" for returns, credit notes, rate differences in customer's favour; "debit_note" for interest/charges/debit notes; "other" if unsure.
- If the document is not a statement of account, return {"lines": []}.`;

async function callGemini(apiKey, parts) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let lastErr = 'AI service unavailable';
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, maxOutputTokens: 32768, responseMimeType: 'application/json' } }),
        });
        if (res.status === 429 || res.status === 503) { lastErr = 'AI service is busy, please retry in a minute'; await sleep(attempt * 2500); continue; }
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { lastErr = d?.error?.message || ('AI error ' + res.status); if (res.status === 400 || res.status === 403) throw new Error(lastErr); break; }
        const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        if (text) return text;
        lastErr = 'AI returned an empty response';
      } catch (e) { lastErr = e.message; if (/API key|PERMISSION|invalid/i.test(lastErr)) throw e; }
    }
  }
  throw new Error(lastErr);
}

function parseJSON(txt) {
  const s = txt.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch { /* try object slice */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error('Could not understand the AI response');
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { statementId, apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: 'Add your Gemini API key in Settings first' }, { status: 400 });
    if (!statementId) return NextResponse.json({ error: 'Statement not specified' }, { status: 400 });

    const { data: st, error } = await c.sb.from('supplier_statements')
      .select('id,firm_id,supplier_name,file_name,file_type,file_data').eq('id', statementId).single();
    if (error || !st) return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    if (st.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!st.file_data) return NextResponse.json({ error: 'This statement has no file attached — please upload it again' }, { status: 400 });

    const type = (st.file_type || '').toLowerCase();
    const name = (st.file_name || '').toLowerCase();
    let parts;
    if (type === 'application/pdf' || type.startsWith('image/')) {
      parts = [{ inline_data: { mime_type: type, data: st.file_data } }, { text: PROMPT }];
    } else if (type.startsWith('text/') || /\.(csv|txt)$/.test(name)) {
      const text = Buffer.from(st.file_data, 'base64').toString('utf8');
      parts = [{ text: PROMPT + '\n\nSTATEMENT DATA:\n' + text.slice(0, 120000) }];
    } else {
      return NextResponse.json({ error: 'This file type can\'t be read. Upload the statement as PDF, image (JPG/PNG) or CSV.' }, { status: 400 });
    }

    const out = parseJSON(await callGemini(apiKey, parts));
    const lines = Array.isArray(out.lines) ? out.lines : Array.isArray(out) ? out : [];
    return NextResponse.json({
      supplierName: out.supplierName || st.supplier_name || '',
      customerName: out.customerName || '',
      periodFrom: out.periodFrom || '',
      periodTo: out.periodTo || '',
      openingBalance: out.openingBalance || null,
      closingBalance: out.closingBalance || null,
      lines,
      fileName: st.file_name,
    });
  } catch (e) {
    console.error('[supplier-statement-recon]', e.message);
    return NextResponse.json({ error: e.message || 'Failed to read statement' }, { status: 500 });
  }
}
