import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/ca/links - CA gets all their links
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

    // Check if user is CA partner
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

    // Get all links with firm details
    const { data: links, error: linksError } = await supabase
      .from('ca_client_links')
      .select(`
        id,
        firm_id,
        status,
        invited_at,
        accepted_at,
        firms(name)
      `)
      .eq('ca_id', caData.id)
      .order('invited_at', { ascending: false });

    if (linksError) {
      return Response.json(
        { error: linksError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      links: links || [],
      linkedCount: (links || []).filter(l => l.status === 'accepted').length,
    });
  } catch (error) {
    console.error('[ca-links-get] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/ca/links/invite - Shop owner invites CA
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

    const { caEmail, caPhone } = await req.json();

    if (!caEmail && !caPhone) {
      return Response.json(
        { error: 'Either email or phone is required' },
        { status: 400 }
      );
    }

    // Verify user owns this firm
    const { data: firmData } = await supabase
      .from('firms')
      .select('id')
      .eq('id', firmId)
      .eq('owner_id', user.id)
      .single();

    if (!firmData) {
      return Response.json(
        { error: 'Firm not found or not owned by you' },
        { status: 404 }
      );
    }

    // Find CA by email or phone
    let caQuery = supabase.from('ca_partners').select('id');

    if (caEmail) {
      caQuery = caQuery.eq('email', caEmail);
    } else {
      caQuery = caQuery.eq('phone', caPhone.replace(/\s/g, ''));
    }

    const { data: caData, error: caError } = await caQuery.single();

    if (caError || !caData) {
      return Response.json(
        { error: 'CA not found. Make sure they have a CA partner account.' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .single();

    if (existingLink) {
      return Response.json(
        { error: 'CA is already linked to this firm' },
        { status: 409 }
      );
    }

    // Create link
    const { data: link, error: linkError } = await supabase
      .from('ca_client_links')
      .insert({
        ca_id: caData.id,
        firm_id: firmId,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (linkError) {
      return Response.json(
        { error: linkError.message },
        { status: 500 }
      );
    }

    // TODO: Send notification to CA (in-app alert + WhatsApp/email)
    console.log('[ca-links-invite] Link created, notify CA:', caData.id);

    return Response.json({
      success: true,
      message: 'Invitation sent to CA',
      link: {
        id: link.id,
        firmId: link.firm_id,
        status: link.status,
      },
    });
  } catch (error) {
    console.error('[ca-links-invite] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
