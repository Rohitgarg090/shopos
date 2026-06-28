export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb } : null;
}

// GET /api/ca/compliance-calendar - Get compliance deadlines for a firm
export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm_id');
    const monthYear = searchParams.get('month_year'); // YYYY-MM format, optional

    if (!firmId) return NextResponse.json({ error: 'firm_id required' }, { status: 400 });

    // Verify CA has access to this firm
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Get deadlines
    let query = supabase
      .from('ca_compliance_deadlines')
      .select('*')
      .eq('firm_id', firmId)
      .order('due_date', { ascending: true });

    if (monthYear) {
      query = query.eq('month_year', monthYear);
    }

    const { data: deadlines, error } = await query;

    if (error) throw error;

    return NextResponse.json(deadlines || []);
  } catch (error) {
    console.error('[compliance-calendar] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/ca/compliance-calendar - Create compliance deadline
export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId, deadlineType, monthYear, dueDate, reminderDate, status, notes } = await req.json();

    if (!firmId || !deadlineType || !monthYear || !dueDate) {
      return NextResponse.json({ error: 'firmId, deadlineType, monthYear, dueDate required' }, { status: 400 });
    }

    // Verify CA has access to this firm
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Check if deadline already exists
    const { data: existing } = await supabase
      .from('ca_compliance_deadlines')
      .select('id')
      .eq('firm_id', firmId)
      .eq('deadline_type', deadlineType)
      .eq('month_year', monthYear)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Deadline already exists for this month' }, { status: 400 });
    }

    // Create deadline
    const { data: newDeadline, error } = await supabase
      .from('ca_compliance_deadlines')
      .insert([{
        ca_id: caData.id,
        firm_id: firmId,
        deadline_type: deadlineType,
        month_year: monthYear,
        due_date: dueDate,
        reminder_date: reminderDate,
        status: status || 'not_started',
        notes: notes || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newDeadline, { status: 201 });
  } catch (error) {
    console.error('[compliance-calendar] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Auto-generate compliance deadlines for a firm
// POST /api/ca/compliance-calendar/generate-defaults
export async function generateDefaults(firmId, caId) {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);

    const deadlineTypes = [
      { type: 'gstr1', dayOfMonth: 11, label: 'GSTR-1' },
      { type: 'gstr2b', dayOfMonth: 12, label: 'GSTR-2B' },
      { type: 'gstr3b', dayOfMonth: 20, label: 'GSTR-3B' },
      { type: 'itc04', dayOfMonth: 30, label: 'ITC-04' },
    ];

    const deadlines = deadlineTypes.map(dt => {
      const [year, month] = currentMonth.split('-');
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, dt.dayOfMonth);

      return {
        ca_id: caId,
        firm_id: firmId,
        deadline_type: dt.type,
        month_year: currentMonth,
        due_date: dueDate.toISOString().split('T')[0],
        reminder_date: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'not_started',
      };
    });

    const { data, error } = await supabase
      .from('ca_compliance_deadlines')
      .upsert(deadlines, { onConflict: 'firm_id,deadline_type,month_year' })
      .select();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[compliance-calendar] Generate defaults error:', error);
    throw error;
  }
}
