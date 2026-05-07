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

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  const { customerId, fromDate, toDate, format = 'csv' } = await req.json();

  try {
    // Get customer details
    const { data: customer } = customerId
      ? await c.sb.from('customers').select('*').eq('id', customerId).eq('firm_id', c.firmId).single()
      : { data: null };

    if (customerId && !customer) {
      return NextResponse.json({ error: 'Customer not found or does not belong to this firm' }, { status: 404 });
    }

    // Get all bills for the customer (or all customers if no customerId specified)
    let billsQuery = c.sb.from('bills')
      .select('*,bill_items(*)')
      .eq('firm_id', c.firmId)
      .order('created_at', { ascending: true });

    if (customerId) {
      billsQuery = billsQuery.eq('customer_id', customerId);
    }

    const { data: bills } = await billsQuery;

    // Get all payments
    let paymentsQuery = c.sb.from('payments').select('*').order('date', { ascending: true });
    if (customerId) {
      const billIds = (bills || []).map(b => b.id);
      if (billIds.length > 0) {
        paymentsQuery = paymentsQuery.in('bill_id', billIds);
      }
    } else {
      paymentsQuery = paymentsQuery.order('created_at', { ascending: true });
    }

    const { data: payments } = await paymentsQuery;

    // Build ledger entries
    const entries = [];
    let balance = customer?.opening_balance || 0;
    const openingDate = customer?.opening_balance_date || new Date(0).toISOString();

    // Add opening balance entry
    if (customer && customer.opening_balance) {
      entries.push({
        date: new Date(openingDate).toLocaleDateString('en-IN'),
        type: 'Opening Balance',
        reference: 'OB',
        debit: customer.opening_balance > 0 ? customer.opening_balance : 0,
        credit: customer.opening_balance < 0 ? Math.abs(customer.opening_balance) : 0,
        balance,
        description: `Opening balance as on ${new Date(openingDate).toLocaleDateString('en-IN')}`,
      });
    }

    // Add bill entries
    if (bills && bills.length > 0) {
      bills.forEach(bill => {
        const debit = bill.total || 0;
        balance += debit;
        entries.push({
          date: new Date(bill.created_at).toLocaleDateString('en-IN'),
          type: 'Sale',
          reference: bill.invoice_no || bill.id,
          debit,
          credit: 0,
          balance: balance.toFixed(2),
          description: `Invoice ${bill.invoice_no || bill.id} - ${bill.customer_name}`,
        });
      });
    }

    // Add payment entries
    if (payments && payments.length > 0) {
      payments.forEach(payment => {
        const credit = payment.amount || 0;
        balance -= credit;
        entries.push({
          date: new Date(payment.date || payment.created_at).toLocaleDateString('en-IN'),
          type: 'Payment',
          reference: payment.cheque_no || payment.upi_ref || payment.id,
          debit: 0,
          credit,
          balance: balance.toFixed(2),
          description: `${payment.mode} payment - ${payment.party_name || payment.id}`,
        });
      });
    }

    // Sort by date
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (format === 'json') {
      return NextResponse.json({
        customer: customer || { name: 'All Customers' },
        entries,
        summary: {
          totalDebit: entries.reduce((s, e) => s + e.debit, 0).toFixed(2),
          totalCredit: entries.reduce((s, e) => s + e.credit, 0).toFixed(2),
          finalBalance: balance.toFixed(2),
        },
      });
    }

    // CSV format
    let csv = 'Date,Type,Reference,Debit (Rs.),Credit (Rs.),Balance (Rs.),Description\n';
    entries.forEach(entry => {
      csv += `"${entry.date}","${entry.type}","${entry.reference}",${entry.debit.toFixed(2)},${entry.credit.toFixed(2)},${entry.balance},"${entry.description}"\n`;
    });

    const filename = `Ledger_${customer ? customer.name.replace(/\s+/g, '_') : 'All'}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
