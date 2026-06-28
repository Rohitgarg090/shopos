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
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // For each firm, calculate metrics
    const clients = await Promise.all(
      (links || []).map(async (link) => {
        try {
          // Count all bills for this firm in current month
          const { count: totalBills, error: billsCountError } = await supabase
            .from('bills')
            .select('id', { count: 'exact', head: true })
            .eq('firm_id', link.firm_id)
            .gte('created_at', monthStartStr)
            .lte('created_at', monthEndStr);

          if (billsCountError) {
            console.error('[ca-dashboard] Bills count error:', billsCountError);
            throw billsCountError;
          }

          const salesCount = totalBills || 0;
          const purchasesCount = 0;

          // Get last invoice date
          const { data: lastInvoiceData, error: invoiceError } = await supabase
            .from('bills')
            .select('created_at')
            .eq('firm_id', link.firm_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (invoiceError && invoiceError.code !== 'PGRST116') {
            console.error('[ca-dashboard] Last invoice error:', invoiceError);
            throw invoiceError;
          }

          const lastInvoice = lastInvoiceData;

          // Get compliance deadlines for this firm (all, not just current month)
          const { data: deadlines, error: deadlineError } = await supabase
            .from('ca_compliance_deadlines')
            .select('id, deadline_type, due_date, status')
            .eq('firm_id', link.firm_id)
            .gte('due_date', monthStartStr)
            .order('due_date', { ascending: true });

          if (deadlineError && deadlineError.code !== 'PGRST116') {
            console.error('[ca-dashboard] Deadline error:', deadlineError);
          }

          // Calculate completion percentage
          const allDeadlines = deadlines || [];
          const completedCount = allDeadlines.filter(d => d.status === 'completed').length;
          const completionPercent = allDeadlines.length > 0
            ? Math.round((completedCount / allDeadlines.length) * 100)
            : 0;

          // Get next deadline
          const nextDeadline = allDeadlines.find(d => d.due_date >= monthStartStr);
          const nextDeadlineDate = nextDeadline?.due_date;
          const nextDeadlineType = nextDeadline?.deadline_type;
          const daysUntilDeadline = nextDeadlineDate
            ? Math.ceil((new Date(nextDeadlineDate) - now) / (1000 * 60 * 60 * 24))
            : null;

          // Calculate status based on completion %
          let status = 'red';
          if (completionPercent === 100) {
            status = 'green';
          } else if (completionPercent >= 70) {
            status = 'amber';
          }

          return {
            firmId: link.firm_id,
            firmName: link.firms?.name || 'Unknown',
            salesCount: salesCount || 0,
            purchasesCount: purchasesCount || 0,
            lastInvoiceDate: lastInvoice?.created_at || null,
            status,
            completionPercent,
            nextDeadlineDate,
            nextDeadlineType,
            daysUntilDeadline,
            monthYear,
          };
        } catch (err) {
          console.error('[ca-dashboard] Error processing firm:', link.firm_id, err);
          throw err;
        }
      })
    );

    // Calculate summary by status
    const upToDate = clients.filter(c => c.completionPercent === 100).length;
    const dataGood = clients.filter(c => c.completionPercent >= 70 && c.completionPercent < 100).length;
    const dataPoor = clients.filter(c => c.completionPercent < 70).length;

    return Response.json({
      success: true,
      currentMonth: monthYear,
      clients,
      summary: {
        total: clients.length,
        upToDate,
        dataGood,
        dataPoor,
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
