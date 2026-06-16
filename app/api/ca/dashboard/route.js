export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/ca/dashboard - Get all linked clients with status
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is CA
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_metadata?.role !== 'ca_partner') {
      return Response.json(
        { error: 'Not a CA partner account' },
        { status: 403 }
      );
    }

    // Get CA ID
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!caData) {
      return Response.json(
        { error: 'CA profile not found' },
        { status: 404 }
      );
    }

    // Get all accepted links with firm details
    const { data: links, error: linksError } = await supabase
      .from('ca_client_links')
      .select(`
        id,
        firm_id,
        firms(id, name)
      `)
      .eq('ca_id', caData.id)
      .eq('status', 'accepted');

    if (linksError) {
      console.error('[ca-dashboard] Links query error:', linksError);
      return Response.json(
        { error: `Database error: ${linksError.message}` },
        { status: 500 }
      );
    }

    // Get current month date range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthYear = now.toISOString().substring(0, 7); // YYYY-MM

    // For each firm, calculate metrics
    const clients = await Promise.all(
      (links || []).map(async (link) => {
        try {
          // Count all bills for the month
          const { count: totalBills, error: billsError } = await supabase
            .from('bills')
            .select('id', { count: 'exact', head: true })
            .eq('firm_id', link.firm_id)
            .gte('date', monthStart.toISOString().split('T')[0])
            .lte('date', monthEnd.toISOString().split('T')[0]);

          if (billsError) {
            console.error('[ca-dashboard] Bills count error:', billsError);
            throw billsError;
          }

          // For now, use total bills as sales count
          // TODO: Once schema is confirmed, split by bill type
          const salesCount = totalBills || 0;
          const purchasesCount = 0;

          // Get last invoice date
          const { data: lastInvoice, error: invoiceError } = await supabase
            .from('bills')
            .select('date')
            .eq('firm_id', link.firm_id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          if (invoiceError && invoiceError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which is okay
            console.error('[ca-dashboard] Last invoice error:', invoiceError);
            throw invoiceError;
          }

        // Calculate status
        const hasSales = (salesCount || 0) > 0;
        const hasPurchases = (purchasesCount || 0) > 0;
        let status = 'red';

        if (hasSales && hasPurchases) {
          status = 'green';
        } else if (lastInvoice && lastInvoice.date) {
          const lastDate = new Date(lastInvoice.date);
          const daysSinceLastInvoice = Math.floor(
            (now - lastDate) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastInvoice > 5) {
            status = 'amber';
          } else {
            status = 'red';
          }
        }

          return {
            firmId: link.firm_id,
            firmName: link.firms?.name || 'Unknown',
            salesCount: salesCount || 0,
            purchasesCount: purchasesCount || 0,
            lastInvoiceDate: lastInvoice?.date || null,
            status,
            monthYear,
          };
        } catch (err) {
          console.error('[ca-dashboard] Error processing firm:', link.firm_id, err);
          throw err;
        }
      })
    );

    // Sort by status (red first, then amber, then green)
    const statusOrder = { red: 0, amber: 1, green: 2 };
    clients.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return Response.json({
      success: true,
      currentMonth: monthYear,
      clients,
      summary: {
        total: clients.length,
        green: clients.filter(c => c.status === 'green').length,
        amber: clients.filter(c => c.status === 'amber').length,
        red: clients.filter(c => c.status === 'red').length,
      },
    });
  } catch (error) {
    console.error('[ca-dashboard] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
