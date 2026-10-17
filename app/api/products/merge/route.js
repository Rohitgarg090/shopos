export const dynamic = 'force-dynamic';
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

const shape = p => ({
  id: p.id, name: p.name, sku: p.sku, cat: p.cat, sub: p.sub || '',
  size: p.size, color: p.color || '', price: +p.price, gst: +p.gst,
  qty: +p.qty, hsn: p.hsn || '', articleNo: p.article_no || '',
  uom: p.unit_of_measure || 'Piece', customAttrs: p.custom_attributes || {},
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST { keepId, mergeIds: [] } — merges duplicates into keepId in one transaction (see products_merge.sql)
export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
  const { keepId, mergeIds } = await req.json().catch(() => ({}));
  const ids = Array.isArray(mergeIds) ? [...new Set(mergeIds.filter(x => UUID.test(String(x)) && x !== keepId))] : [];
  if (!UUID.test(String(keepId || '')) || ids.length === 0 || ids.length > 50) {
    return NextResponse.json({ error: 'Choose a product to keep and at least one duplicate' }, { status: 400 });
  }
  const { data, error } = await c.sb.rpc('merge_products', { p_firm_id: c.firmId, p_keep: keepId, p_merge: ids });
  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message || '')) {
      return NextResponse.json({ error: 'Merging needs a one-time database update: run supabase/migrations/products_merge.sql in Supabase.' }, { status: 501 });
    }
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === 'P0001' ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ product: row ? shape(row) : null, removed: ids });
}
