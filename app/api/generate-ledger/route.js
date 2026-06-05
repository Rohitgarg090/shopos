import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    const firmId = req.headers.get('x-firm-id');

    if (!token || !firmId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, sendVia } = await req.json();

    if (!customerId) {
      return Response.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Fetch customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (custError || !customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch all bills for this customer
    const { data: bills } = await supabase
      .from('bills')
      .select('*')
      .eq('customerId', customerId)
      .eq('firmId', firmId)
      .order('date', { ascending: true });

    // Fetch all payments for this customer
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .order('date', { ascending: true });

    // Build ledger data
    const ledgerEntries = [];
    let runningBalance = customer.openingBalance || 0;

    // Add opening balance if exists
    if (customer.openingBalance && customer.openingBalance > 0) {
      ledgerEntries.push({
        date: customer.openingBalanceDate || new Date().toISOString(),
        description: 'Opening Balance',
        debit: 0,
        credit: customer.openingBalance,
        balance: runningBalance,
        type: 'opening',
      });
    }

    // Add bill entries
    if (bills && bills.length > 0) {
      bills.forEach(bill => {
        runningBalance += bill.total;
        ledgerEntries.push({
          date: bill.date,
          description: `Invoice #${bill.invoiceNo || bill.id.substring(0, 8)}`,
          debit: bill.total,
          credit: 0,
          balance: runningBalance,
          type: 'invoice',
        });
      });
    }

    // Add payment entries
    if (payments && payments.length > 0) {
      const billIds = (bills || []).map(b => b.id);
      payments
        .filter(p => billIds.includes(p.billId))
        .forEach(payment => {
          runningBalance -= payment.amount;
          ledgerEntries.push({
            date: payment.date,
            description: `Payment Received (${payment.mode})`,
            debit: 0,
            credit: payment.amount,
            balance: runningBalance,
            type: 'payment',
          });
        });
    }

    // Generate text ledger for WhatsApp
    const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const fmt = (n) => 'Rs.' + Number(n || 0).toFixed(2);

    const textLedger = `📋 LEDGER - ${customer.name}

Opening Balance: ${fmt(customer.openingBalance || 0)}

Date        | Description        | Debit    | Credit   | Balance
─────────────────────────────────────────────────────────────────
${ledgerEntries
      .map(
        entry =>
          `${formatDate(entry.date).padEnd(11)} | ${entry.description.substring(0, 18).padEnd(18)} | ${
            entry.debit > 0 ? fmt(entry.debit).padStart(8) : '        '
          } | ${entry.credit > 0 ? fmt(entry.credit).padStart(8) : '        '} | ${fmt(entry.balance).padStart(8)}`
      )
      .join('\n')}

─────────────────────────────────────────────────────────────────
Outstanding Balance: ${fmt(Math.max(0, runningBalance))}

Generated: ${new Date().toLocaleString('en-IN')}`;

    // Generate HTML ledger for email
    const htmlLedger = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1B5E8A; color: white; padding: 20px; border-radius: 8px; }
    .content { background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #1B5E8A; color: white; padding: 10px; text-align: left; font-weight: 600; }
    td { padding: 10px; border-bottom: 0.5px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
    .total { font-weight: bold; background: #EBF5E4; border: 0.5px solid #2E6B1F; }
    .outstanding { font-size: 18px; font-weight: bold; color: #2E6B1F; margin-top: 20px; }
    .footer { margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Account Ledger</h2>
      <p>${customer.name}</p>
    </div>
    <div class="content">
      <p>Dear ${customer.name},</p>
      <p>Here is your account statement as of ${new Date().toLocaleDateString('en-IN')}.</p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${ledgerEntries
            .map(
              entry => `
          <tr ${entry.type === 'opening' || entry.type === 'invoice' ? 'style="font-weight: 500;"' : ''}>
            <td>${formatDate(entry.date)}</td>
            <td>${entry.description}</td>
            <td>${entry.debit > 0 ? fmt(entry.debit) : '—'}</td>
            <td>${entry.credit > 0 ? fmt(entry.credit) : '—'}</td>
            <td style="font-weight: 600;">${fmt(entry.balance)}</td>
          </tr>
          `
            )
            .join('')}
          <tr class="total">
            <td colspan="4" style="text-align: right;">Outstanding Balance:</td>
            <td>${fmt(Math.max(0, runningBalance))}</td>
          </tr>
        </tbody>
      </table>

      <p>Thank you for your business!</p>
    </div>
    <div class="footer">
      <p>This is an automated statement. Please contact us if you have any questions.</p>
      <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </div>
</body>
</html>`;

    const result = {
      success: true,
      ledger: {
        entries: ledgerEntries,
        textFormat: textLedger,
        htmlFormat: htmlLedger,
        totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
        totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
        balance: runningBalance,
      },
    };

    // Send via requested channel
    if (sendVia === 'whatsapp' || sendVia === 'both') {
      try {
        const whatsappRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-firm-id': firmId,
            },
            body: JSON.stringify({
              phone: customer.phone,
              message: textLedger,
              type: 'whatsapp',
            }),
          }
        );

        if (whatsappRes.ok) {
          result.sentWhatsapp = true;
          console.log('[generate-ledger] WhatsApp sent');
        } else {
          result.whatsappError = 'Failed to send via WhatsApp';
        }
      } catch (err) {
        console.error('[generate-ledger] WhatsApp error:', err);
        result.whatsappError = err.message;
      }
    }

    if (sendVia === 'email' || sendVia === 'both') {
      try {
        const emailRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-invoice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-firm-id': firmId,
            },
            body: JSON.stringify({
              email: customer.email,
              subject: `Your Account Ledger - ${new Date().toLocaleDateString('en-IN')}`,
              html: htmlLedger,
            }),
          }
        );

        if (emailRes.ok) {
          result.sentEmail = true;
          console.log('[generate-ledger] Email sent');
        } else {
          result.emailError = 'Failed to send via Email';
        }
      } catch (err) {
        console.error('[generate-ledger] Email error:', err);
        result.emailError = err.message;
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[generate-ledger] Error:', error);
    return Response.json(
      { error: 'Failed to generate ledger' },
      { status: 500 }
    );
  }
}
