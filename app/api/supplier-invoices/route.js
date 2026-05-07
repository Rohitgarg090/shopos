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

const shape = r => ({
  id: r.id,
  supplierName: r.supplier_name,
  supplierGSTIN: r.supplier_gstin || '',
  invoiceNo: r.invoice_no || '',
  invoiceDate: r.invoice_date || '',
  place: r.place || '',
  subtotal: +r.subtotal || 0,
  discount: +r.discount || 0,
  discountPct: +r.discount_pct || 0,
  cgst: +r.cgst || 0,
  sgst: +r.sgst || 0,
  igst: +r.igst || 0,
  roundOff: +r.round_off || 0,
  total: +r.total || 0,
  notes: r.notes || '',
  items: r.items || [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data, error } = await c.sb.from('supplier_invoices')
    .select('*').eq('firm_id', c.firmId).order('invoice_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data, error } = await c.sb.from('supplier_invoices').insert([{
    firm_id: c.firmId,
    supplier_name: b.supplierName,
    supplier_gstin: b.supplierGSTIN || '',
    invoice_no: b.invoiceNo || '',
    invoice_date: b.invoiceDate || null,
    place: b.place || '',
    subtotal: +b.subtotal || 0,
    discount: +b.discount || 0,
    discount_pct: +b.discountPct || 0,
    cgst: +b.cgst || 0,
    sgst: +b.sgst || 0,
    igst: +b.igst || 0,
    round_off: +b.roundOff || 0,
    total: +b.total || 0,
    notes: b.notes || '',
    items: b.items || [],
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { id, ...rest } = b;

  // Verify supplier invoice belongs to this firm
  const { data: invoice } = await c.sb.from('supplier_invoices').select('firm_id').eq('id', id).single();
  if (!invoice || invoice.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updates = {
    supplier_name: rest.supplierName,
    supplier_gstin: rest.supplierGSTIN || '',
    invoice_no: rest.invoiceNo || '',
    invoice_date: rest.invoiceDate || null,
    place: rest.place || '',
    subtotal: +rest.subtotal || 0,
    discount: +rest.discount || 0,
    discount_pct: +rest.discountPct || 0,
    cgst: +rest.cgst || 0,
    sgst: +rest.sgst || 0,
    igst: +rest.igst || 0,
    round_off: +rest.roundOff || 0,
    total: +rest.total || 0,
    notes: rest.notes || '',
    items: rest.items || [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await c.sb.from('supplier_invoices')
    .update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify supplier invoice belongs to this firm
  const { data: invoice } = await c.sb.from('supplier_invoices').select('firm_id').eq('id', id).single();
  if (!invoice || invoice.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await c.sb.from('supplier_invoices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}