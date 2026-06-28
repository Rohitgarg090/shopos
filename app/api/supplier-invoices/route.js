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
  try {
    console.log('\n=== [supplier-invoices] POST START ===');

    const c = await ctx(req);
    console.log('[supplier-invoices] Auth context:', { userId: c?.user?.id, firmId: c?.firmId });

    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check trial limits
    console.log('[supplier-invoices] Fetching trial limits for user:', c.user.id);

    const { data: trial, error: trialError } = await c.sb
      .from('trial_limits')
      .select('*')
      .eq('user_id', c.user.id)
      .single();

    console.log('[supplier-invoices] Trial query result:', {
      hasData: !!trial,
      error: trialError?.message,
      plan: trial?.subscription_plan,
      scansUsed: trial?.ai_scans_used,
      scansLimit: trial?.ai_scans_limit,
    });

    // Validate trial limits
    if (trial) {
      // Check if trial expired
      if (trial.trial_ends_at && new Date() > new Date(trial.trial_ends_at)) {
        console.log('[supplier-invoices] BLOCKING: Trial expired');
        return NextResponse.json(
          { error: 'Your trial has expired. Please upgrade to continue uploading invoices.' },
          { status: 403 }
        );
      }

      // Check free trial limit
      if ((trial.subscription_plan === 'free_trial' || trial.subscription_plan === 'trial') &&
          trial.ai_scans_used >= trial.ai_scans_limit) {
        console.log('[supplier-invoices] BLOCKING: Free trial limit reached');
        return NextResponse.json(
          {
            error: `You have used all ${trial.ai_scans_limit} free invoice scans. Upgrade to Business plan for unlimited.`,
            scansUsed: trial.ai_scans_used,
            scansLimit: trial.ai_scans_limit,
          },
          { status: 403 }
        );
      }

      // Check basic plan monthly limit
      if (trial.subscription_plan === 'basic' && trial.ai_scans_used_this_month >= 50) {
        console.log('[supplier-invoices] BLOCKING: Basic plan limit reached');
        return NextResponse.json(
          {
            error: "You have reached your 50 AI scans/month limit. Limit resets next month.",
            scansUsedThisMonth: trial.ai_scans_used_this_month,
          },
          { status: 403 }
        );
      }
    } else {
      console.log('[supplier-invoices] WARNING: No trial record found');
    }

    console.log('[supplier-invoices] Trial check PASSED, creating invoice');

    // Create invoice
    const b = await req.json();
    console.log('[supplier-invoices] Invoice data:', {
      supplierName: b.supplierName,
      invoiceNo: b.invoiceNo,
      invoiceDateRaw: b.invoiceDate,
      itemCount: b.items?.length || 0,
    });

    // Parse invoice date to ISO format (YYYY-MM-DD)
    let invoiceDateFormatted = null;
    if (b.invoiceDate) {
      try {
        // Handle DD/M/YYYY or DD-M-YYYY format
        let dateStr = b.invoiceDate.toString().trim();
        console.log('[supplier-invoices] Parsing date:', dateStr);

        if (dateStr.includes('/') || dateStr.includes('-')) {
          const parts = dateStr.replace(/\//g, '-').split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            invoiceDateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log('[supplier-invoices] Converted date to:', invoiceDateFormatted);
          }
        } else {
          invoiceDateFormatted = b.invoiceDate;
        }
      } catch (e) {
        console.warn('[supplier-invoices] Date parse error:', e.message);
        invoiceDateFormatted = null;
      }
    }

    const { data, error } = await c.sb.from('supplier_invoices').insert([{
      firm_id: c.firmId,
      supplier_name: b.supplierName,
      supplier_gstin: b.supplierGSTIN || '',
      invoice_no: b.invoiceNo || '',
      invoice_date: invoiceDateFormatted,
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

    if (error) {
      console.error('[supplier-invoices] Invoice insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[supplier-invoices] Invoice created:', { id: data.id });

    // Increment counter AFTER successful invoice creation
    if (trial) {
      try {
        console.log('[supplier-invoices] INCREMENTING counter for plan:', trial.subscription_plan);

        if (trial.subscription_plan === 'free_trial' || trial.subscription_plan === 'trial') {
          const newCount = trial.ai_scans_used + 1;
          console.log('[supplier-invoices] Updating ai_scans_used:', trial.ai_scans_used, '→', newCount);

          const { error: updateError } = await c.sb
            .from('trial_limits')
            .update({ ai_scans_used: newCount })
            .eq('user_id', c.user.id);

          if (updateError) {
            console.error('[supplier-invoices] Update error:', updateError.message);
          } else {
            console.log('[supplier-invoices] ✅ Counter updated successfully');
          }
        } else if (trial.subscription_plan === 'basic') {
          const newCount = trial.ai_scans_used_this_month + 1;
          console.log('[supplier-invoices] Updating ai_scans_used_this_month:', trial.ai_scans_used_this_month, '→', newCount);

          const { error: updateError } = await c.sb
            .from('trial_limits')
            .update({ ai_scans_used_this_month: newCount })
            .eq('user_id', c.user.id);

          if (updateError) {
            console.error('[supplier-invoices] Update error:', updateError.message);
          } else {
            console.log('[supplier-invoices] ✅ Monthly counter updated successfully');
          }
        }
      } catch (e) {
        console.error('[supplier-invoices] ❌ Error incrementing counter:', e.message);
      }
    }

    console.log('=== [supplier-invoices] POST END ===\n');
    return NextResponse.json(shape(data), { status: 201 });

  } catch (error) {
    console.error('[supplier-invoices] ❌ POST ERROR:', error.message);
    console.log('=== [supplier-invoices] POST END (ERROR) ===\n');
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
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
