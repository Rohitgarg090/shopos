export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = p => ({
  id: p.id, name: p.name, sku: p.sku, cat: p.cat, sub: p.sub||'',
  size: p.size, color: p.color||'', price: +p.price, gst: +p.gst,
  qty: +p.qty, hsn: p.hsn||'', articleNo: p.article_no||'',
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data, error } = await c.sb.from('products').select('*').eq('firm_id', c.firmId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data, error } = await c.sb.from('products').insert([{
    name: b.name, sku: b.sku, cat: b.cat, sub: b.sub||'',
    size: b.size, color: b.color||'', price: +b.price, gst: +b.gst,
    qty: +b.qty, hsn: b.hsn||'', article_no: b.articleNo||'',
    firm_id: c.firmId || null,
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PUT(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { id, ...f } = b;

  // Verify product belongs to this firm
  const { data: product } = await c.sb.from('products').select('firm_id').eq('id', id).single();
  if (!product || product.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Only update fields that are provided
  const updates = {};
  if (f.name  !== undefined) updates.name       = f.name;
  if (f.sku   !== undefined) updates.sku        = f.sku;
  if (f.cat   !== undefined) updates.cat        = f.cat;
  if (f.sub   !== undefined) updates.sub        = f.sub||'';
  if (f.size  !== undefined) updates.size       = f.size;
  if (f.color !== undefined) updates.color      = f.color||'';
  if (f.price !== undefined) updates.price      = +f.price;
  if (f.gst   !== undefined) updates.gst        = +f.gst;
  if (f.qty   !== undefined) updates.qty        = +f.qty;
  if (f.hsn   !== undefined) updates.hsn        = f.hsn||'';
  if (f.articleNo !== undefined) updates.article_no = f.articleNo||'';
  const { data, error } = await c.sb.from('products').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify product belongs to this firm before deleting
  const { data: product } = await c.sb.from('products').select('firm_id').eq('id', id).single();
  if (!product || product.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await c.sb.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}