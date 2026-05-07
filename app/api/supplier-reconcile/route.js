import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { matchSupplierTransactions } from '@/lib/supplierReconcileEngine';

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

const PROMPT = `You are a supplier account statement parser for Indian GST businesses.
Extract ALL line items from this supplier statement.

OUTPUT ONLY RAW JSON ARRAY — no markdown, no explanation, no backticks.
Start with [ and end with ].

Format each line as:
{"date":"DD/MM/YYYY","invoiceNo":"invoice number","description":"text","amount":1000.00,"type":"invoice","suppliersGstin":"GSTIN if visible","supplierName":"supplier name"}

RULES:
- type: "invoice" for purchase invoices, "credit_note" for returns/credits, "other" for opening/closing balance lines
- invoiceNo: extract EXACTLY as printed — this is critical for matching (e.g., "INV-2025-001")
- amount: positive number always (do not include negative sign)
- date in DD/MM/YYYY format
- description: keep as shown in statement, do not modify
- supplierGstin: only if visible on statement
- supplierName: extracted from statement header if available
- Include ALL rows — do not skip any transaction
- If unclear amount, put 0

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
    const { apiKey, csvText, imageData, imageType, sessionId, supplierName, invoices } = body;

    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not set' }, { status: 400 });

    let parts;
    if (imageData) {
      parts = [
        { inline_data: { mime_type: imageType || 'image/jpeg', data: imageData } },
        { text: PROMPT }
      ];
    } else if (csvText) {
      parts = [{ text: `${PROMPT}\n\nSupplier Statement Data:\n${csvText.slice(0, 15000)}` }];
    } else {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    const rawText = await callGemini(apiKey, parts);
    const geminiLines = extractJSON(rawText);

    if (!Array.isArray(geminiLines)) {
      return NextResponse.json({ error: 'Gemini returned unexpected format' }, { status: 400 });
    }

    // Normalize statement lines
    const stmtLines = geminiLines.map((line, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      txn_date: convertTxnDate(line.date),
      invoice_no: line.invoiceNo || '',
      description: line.description || '',
      amount: +line.amount || 0,
      txn_type: (line.type || '').toLowerCase() === 'credit_note' ? 'credit_note' : 'invoice',
      supplier_name: line.supplierName || supplierName || '',
      supplier_gstin: line.supplierGstin || '',
      match_status: 'unmatched',
      match_score: 0,
      matched_invoice_id: null,
      sort_order: idx
    }));

    // Load supplier invoices if not provided
    let allInvoices = invoices || [];
    if (!allInvoices || allInvoices.length === 0) {
      const { data: supInvoices } = await c.sb.from('supplier_invoices')
        .select('*')
        .eq('firm_id', c.firmId);
      allInvoices = supInvoices || [];
    }

    // Score and match using supplier reconcile engine
    const scored = matchSupplierTransactions(stmtLines, allInvoices);

    // Persist to DB if sessionId provided
    if (sessionId && c.firmId) {
      const txnsToInsert = scored.map(line => ({
        session_id: sessionId,
        firm_id: c.firmId,
        txn_date: line.txn_date,
        invoice_no: line.invoice_no,
        description: line.description,
        amount: line.amount,
        txn_type: line.txn_type,
        match_status: line.match_status,
        match_score: line.match_score,
        matched_invoice_id: line.matched_invoice_id,
        match_ref: line.match_ref,
        sort_order: line.sort_order
      }));

      const { error: insertErr } = await c.sb.from('supplier_recon_transactions')
        .insert(txnsToInsert);

      if (insertErr) {
        return NextResponse.json({ error: 'Failed to save transactions: ' + insertErr.message }, { status: 500 });
      }

      // Update session status
      await c.sb.from('supplier_recon_sessions')
        .update({ status: 'reviewing', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Refresh stats via RPC
      await c.sb.rpc('refresh_supplier_session_stats', { p_session_id: sessionId });
    }

    const stats = {
      total: scored.length,
      matched: scored.filter(l => l.match_status === 'matched').length,
      likely: scored.filter(l => l.match_status === 'likely').length,
      unmatched: scored.filter(l => l.match_status === 'unmatched').length,
      totalAmount: scored.reduce((s, l) => s + l.amount, 0)
    };

    return NextResponse.json({ sessionId, transactions: scored, stats });
  } catch (e) {
    console.error('[supplier-reconcile]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
