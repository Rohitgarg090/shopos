import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a CA partner
    if (user.user_metadata?.role !== 'ca_partner') {
      return Response.json(
        { error: 'Not a CA partner account' },
        { status: 403 }
      );
    }

    // Get CA profile
    const { data: caProfile, error: caError } = await supabase
      .from('ca_partners')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (caError || !caProfile) {
      return Response.json(
        { error: 'CA profile not found' },
        { status: 404 }
      );
    }

    // Get linked clients count
    const { count: linkedClientsCount } = await supabase
      .from('ca_client_links')
      .select('*', { count: 'exact', head: true })
      .eq('ca_id', caProfile.id)
      .eq('status', 'accepted');

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      ca: {
        id: caProfile.id,
        name: caProfile.name,
        phone: caProfile.phone,
        firmName: caProfile.firm_name,
        gstin: caProfile.gstin,
        linkedClientsCount: linkedClientsCount || 0,
      },
    });
  } catch (error) {
    console.error('[ca-auth-me] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
