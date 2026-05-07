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

async function parseQuery(query, geminiKey) {
  console.log('[parseQuery] Starting with geminiKey:', geminiKey ? 'provided' : 'missing');

  if (!geminiKey) {
    console.log('[parseQuery] No key, defaulting to type=all');
    return { type: 'all', filters: {} };
  }

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + geminiKey;
    const payload = {
      contents: [{
        parts: [{
          text: `Parse this search query and return ONLY valid JSON.
Query: "${query}"
Return JSON only (no markdown):
{"type":"bills","filters":{"party":null,"dateRange":"all","minAmount":null,"maxAmount":null,"status":"all"}}`
        }]
      }],
      generationConfig: { temperature: 0.2 }
    };

    console.log('[parseQuery] Calling Gemini...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[parseQuery] Response status:', response.status);
    const data = await response.json();

    if (data.error) {
      console.log('[parseQuery] Gemini error:', data.error);
      return { type: 'all', filters: {} };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[parseQuery] Raw response:', text.substring(0, 100));

    if (!text) {
      console.log('[parseQuery] Empty response from Gemini');
      return { type: 'all', filters: {} };
    }

    const parsed = JSON.parse(text);
    console.log('[parseQuery] Successfully parsed:', parsed);
    return parsed;
  } catch (e) {
    console.log('[parseQuery] Error:', e.message);
    return { type: 'all', filters: {} };
  }
}

function getDateRange(range) {
  const now = new Date();
  let start;
  switch (range) {
    case 'last7days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'lastmonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case 'thismonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return null;
  }
  return start.toISOString().split('T')[0];
}

function normalizeResults(items, type) {
  return items.map(item => ({
    id: item.id,
    type,
    date: item.bill_date || item.invoice_date || item.payment_date || item.created_at,
    amount: item.total || item.subtotal || 0,
    party: item.customer_name || item.supplier_name || item.mobile || item.name || 'N/A',
    description: type === 'bills' ? `Bill #${item.bill_no}` :
                 type === 'invoices' ? `Invoice #${item.invoice_no}` :
                 type === 'payments' ? `Payment` :
                 type === 'customers' ? `Customer` : '',
    status: item.status || 'N/A'
  }));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);

  const { query, geminiKey } = await req.json();
  console.log('[search] Query:', query, 'Key:', geminiKey ? 'yes' : 'no');
  if (!query) return NextResponse.json([]);

  const parsed = await parseQuery(query, geminiKey);
  const type = parsed?.type || 'all';
  const filters = parsed?.filters || {};
  const results = [];
  const limit = 5;

  console.log('[search] Using type:', type, 'filters:', filters);

  const dateStart = filters?.dateRange ? getDateRange(filters.dateRange) : null;

  // Bills
  if (type === 'all' || type === 'bills') {
    let q = c.sb.from('bills').select('*').eq('firm_id', c.firmId);
    if (dateStart) q = q.gte('bill_date', dateStart);
    if (filters?.party) q = q.ilike('customer_name', `%${filters.party}%`);
    if (filters?.minAmount) q = q.gte('total', filters.minAmount);
    if (filters?.maxAmount) q = q.lte('total', filters.maxAmount);
    if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
    const { data } = await q.order('bill_date', { ascending: false }).limit(limit);
    if (data) results.push(...normalizeResults(data, 'bills'));
  }

  // Supplier Invoices
  if (type === 'all' || type === 'invoices') {
    let q = c.sb.from('supplier_invoices').select('*').eq('firm_id', c.firmId);
    if (dateStart) q = q.gte('invoice_date', dateStart);
    if (filters?.party) q = q.ilike('supplier_name', `%${filters.party}%`);
    if (filters?.minAmount) q = q.gte('total', filters.minAmount);
    if (filters?.maxAmount) q = q.lte('total', filters.maxAmount);
    const { data } = await q.order('invoice_date', { ascending: false }).limit(limit);
    if (data) results.push(...normalizeResults(data, 'invoices'));
  }

  // Payments
  if (type === 'all' || type === 'payments') {
    let q = c.sb.from('payments').select('*').eq('firm_id', c.firmId);
    if (dateStart) q = q.gte('payment_date', dateStart);
    if (filters?.party) q = q.ilike('party_name', `%${filters.party}%`);
    if (filters?.minAmount) q = q.gte('amount', filters.minAmount);
    if (filters?.maxAmount) q = q.lte('amount', filters.maxAmount);
    const { data } = await q.order('payment_date', { ascending: false }).limit(limit);
    if (data) results.push(...normalizeResults(data, 'payments'));
  }

  // Customers
  if (type === 'all' || type === 'customers') {
    let q = c.sb.from('customers').select('*').eq('firm_id', c.firmId);
    if (filters?.party) q = q.ilike('name', `%${filters.party}%`);
    const { data } = await q.limit(limit);
    if (data) results.push(...normalizeResults(data, 'customers'));
  }

  const sorted = results
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 20);

  console.log('[search] Returning', sorted.length, 'results');
  return NextResponse.json(sorted);
}
