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
  id: s.id,
  fileName: s.file_name,
  fileType: s.file_type,
  fileSize: s.file_size,
  uploadedAt: s.uploaded_at,
  description: s.description || '',
  transactionCount: s.transaction_count || 0,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);

  const { data, error } = await c.sb.from('bank_statements')
    .select('id,file_name,file_type,file_size,description,uploaded_at,transaction_count')
    .eq('firm_id', c.firmId)
    .order('uploaded_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();
  if (!b.fileName) return NextResponse.json({ error: 'File name required' }, { status: 400 });

  const sizeMB = (b.fileData ? b.fileData.length * 0.75 : 0) / (1024 * 1024);
  if (sizeMB > 10) return NextResponse.json({ error: 'File too large — max 10MB' }, { status: 400 });

  const { data, error } = await c.sb.from('bank_statements').insert([{
    firm_id: c.firmId,
    file_name: b.fileName,
    file_type: b.fileType || 'application/pdf',
    file_data: b.fileData || '',
    file_size: b.fileSize || 0,
    description: b.description || '',
    transaction_count: 0,
  }]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify statement belongs to this firm
  const { data: statement } = await c.sb.from('bank_statements').select('firm_id').eq('id', id).single();
  if (!statement || statement.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await c.sb.from('bank_statements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
