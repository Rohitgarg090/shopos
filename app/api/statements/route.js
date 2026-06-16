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

const shape = s => ({
  id: s.id, customerId: s.customer_id, fileName: s.file_name,
  fileType: s.file_type, fileData: s.file_data, fileSize: s.file_size,
  description: s.description||'', statementDate: s.statement_date||'',
  uploadedAt: s.uploaded_at,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const customerId = new URL(req.url).searchParams.get('customerId');
  const query = c.sb.from('customer_statements').select('id,customer_id,file_name,file_type,file_size,description,statement_date,uploaded_at')
    .eq('firm_id', c.firmId).order('uploaded_at', { ascending: false });
  if (customerId) query.eq('customer_id', customerId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data||[]).map(s => ({ ...shape(s), fileData: undefined })));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  if (!b.fileData) return NextResponse.json({ error: 'No file data' }, { status: 400 });
  const sizeMB = (b.fileData.length * 0.75) / (1024 * 1024);
  if (sizeMB > 5) return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 });
  const { data, error } = await c.sb.from('customer_statements').insert([{
    customer_id: b.customerId, firm_id: c.firmId,
    file_name: b.fileName, file_type: b.fileType,
    file_data: b.fileData, file_size: b.fileSize||0,
    description: b.description||'', statement_date: b.statementDate||null,
  }]).select('id,customer_id,file_name,file_type,file_size,description,statement_date,uploaded_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...shape(data), fileData: undefined }, { status: 201 });
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify statement belongs to this firm
  const { data: statement } = await c.sb.from('customer_statements').select('firm_id').eq('id', id).single();
  if (!statement || statement.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await c.sb.from('customer_statements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// GET with file data for download
export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const { data, error } = await c.sb.from('customer_statements').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}