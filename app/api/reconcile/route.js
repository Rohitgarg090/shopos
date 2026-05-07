import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { matchTransactions } from '@/lib/reconcileEngine';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash-latest'];

async function callGemini(apiKey, parts) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 8192 } }) }
        );
        if (res.status === 503 || res.status === 429) { await sleep(attempt * 3000); continue; }
        if (res.ok) {
          const d = await res.json();
          return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
        break;
      } catch { if (attempt === 3) break; await sleep(2000); }
    }
  }
  throw new Error('All Gemini models failed');
}

function extractJSON(txt) {
  let s = txt.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(s); } catch {}
  const s1 = s.indexOf('['), e1 = s.lastIndexOf(']');
  if (s1 !== -1 && e1 > s1) { try { return JSON.parse(s.slice(s1, e1 + 1)); } catch {} }
  const s2 = s.indexOf('{'), e2 = s.lastIndexOf('}');
  if (s2 !== -1 && e2 > s2) { try { const p = JSON.parse(s.slice(s2, e2 + 1)); return p.transactions || p; } catch {} }
  throw new Error('Could not parse Gemini response as JSON');
}

const PROMPT = `You are a bank statement parser for Indian bank accounts.
Extract ALL transactions from this bank statement.

OUTPUT ONLY RAW JSON ARRAY — no markdown, no explanation, no backticks.
Start with [ and end with ].

Format each transaction as:
{"date":"DD/MM/YYYY","description":"original text from statement","amount":1000.00,"type":"credit","balance":50000.00,"ref":"reference or cheque number if visible"}

RULES:
- type must be exactly "credit" or "debit"
- amount must be positive number regardless of type
- date in DD/MM/YYYY format
- description: keep original text as-is, do not modify
- balance: running balance if shown, else 0
- ref: UTR/cheque/reference number if visible, else empty string
- Include ALL rows — do not skip any transaction
- If unclear amount, put 0
- Indian formats: Cr = credit, Dr = debit, + = credit, - = debit

If no transactions found return: []`;

function convertTxnDate(ddMmYyyy) {
  if (!ddMmYyyy) return new Date().toISOString().split('T')[0];
  const [d, m, y] = ddMmYyyy.split('/');
  return `${y}-${m}-${d}`;
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { apiKey, csvText, imageData, imageType, bills, payments, sessionId, scope, firmId } = body;

    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not set. Go to Settings.' }, { status: 400 });

    let parts;
    if (imageData) {
      parts = [
        { inline_data: { mime_type: imageType || 'image/jpeg', data: imageData } },
        { text: PROMPT }
      ];
    } else if (csvText) {
      parts = [{ text: `${PROMPT}\n\nBank Statement Data:\n${csvText.slice(0, 15000)}` }];
    } else {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    const rawText = await callGemini(apiKey, parts);
    const geminiTxns = extractJSON(rawText);

    if (!Array.isArray(geminiTxns)) {
      return NextResponse.json({ error: 'Gemini returned unexpected format' }, { status: 400 });
    }

    // Normalize transaction format
    const transactions = geminiTxns.map((t, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      txn_date: convertTxnDate(t.date),
      description: t.description || '',
      ref_no: t.ref || '',
      amount: +t.amount || 0,
      txn_type: (t.type || '').toLowerCase() === 'credit' ? 'credit' : 'debit',
      balance: +t.balance || 0,
      match_status: 'unmatched',
      match_score: 0,
      matched_payment_id: null,
      sort_order: idx
    }));

    // Load payments based on scope
    let allPayments = [];
    if (scope === 'firm' && c.firmId) {
      const { data: allBills } = await c.sb.from('bills')
        .select('id').eq('firm_id', c.firmId);
      const billIds = (allBills || []).map(b => b.id);
      if (billIds.length > 0) {
        const { data: allPmts } = await c.sb.from('payments')
          .select('*').in('bill_id', billIds);
        allPayments = allPmts || [];
      }
    } else {
      allPayments = payments || [];
    }

    // Score and match transactions using reconcileEngine
    const scored = matchTransactions(transactions, allPayments || []);

    // Persist to DB if sessionId provided
    if (sessionId && c.firmId) {
      const txnsToInsert = scored.map(t => ({
        session_id: sessionId,
        firm_id: c.firmId,
        txn_date: t.txn_date,
        description: t.description,
        ref_no: t.ref_no,
        amount: t.amount,
        txn_type: t.txn_type,
        balance: t.balance,
        match_status: t.match_status,
        match_score: t.match_score,
        matched_payment_id: t.matched_payment_id,
        matched_type: t.matched_type,
        match_ref: t.match_ref,
        sort_order: t.sort_order
      }));

      const { error: insertErr } = await c.sb.from('recon_transactions')
        .insert(txnsToInsert);

      if (insertErr) {
        return NextResponse.json({ error: 'Failed to save transactions: ' + insertErr.message }, { status: 500 });
      }

      // Update session status to reviewing
      await c.sb.from('recon_sessions')
        .update({ status: 'reviewing', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Refresh stats via RPC
      await c.sb.rpc('refresh_session_stats', { p_session_id: sessionId });
    }

    const stats = {
      total: scored.length,
      matched: scored.filter(t => t.match_status === 'matched').length,
      likely: scored.filter(t => t.match_status === 'likely').length,
      unmatched: scored.filter(t => t.match_status === 'unmatched').length,
      totalCredits: scored.filter(t => t.txn_type === 'credit').reduce((s, t) => s + t.amount, 0),
      totalDebits: scored.filter(t => t.txn_type === 'debit').reduce((s, t) => s + t.amount, 0),
    };

    return NextResponse.json({ sessionId, transactions: scored, stats });
  } catch (e) {
    console.error('[reconcile]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
