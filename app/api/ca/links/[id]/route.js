import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PATCH /api/ca/links/[id] - CA accepts or rejects invitation
export async function PATCH(req, { params }) {
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

    const { id: linkId } = params;
    const { status } = await req.json();

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return Response.json(
        { error: 'Status must be "accepted" or "rejected"' },
        { status: 400 }
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

    // Get and verify link belongs to this CA
    const { data: link, error: linkGetError } = await supabase
      .from('ca_client_links')
      .select('*')
      .eq('id', linkId)
      .eq('ca_id', caData.id)
      .single();

    if (linkGetError || !link) {
      return Response.json(
        { error: 'Link not found or not yours' },
        { status: 404 }
      );
    }

    // Can only respond to pending invitations
    if (link.status !== 'pending') {
      return Response.json(
        { error: `Cannot update ${link.status} invitation` },
        { status: 400 }
      );
    }

    // Update link status
    const { data: updatedLink, error: updateError } = await supabase
      .from('ca_client_links')
      .update({
        status,
        accepted_at: status === 'accepted' ? new Date().toISOString() : null,
      })
      .eq('id', linkId)
      .select()
      .single();

    if (updateError) {
      return Response.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // TODO: Notify shop owner of CA's response

    return Response.json({
      success: true,
      message: `Invitation ${status}`,
      link: {
        id: updatedLink.id,
        status: updatedLink.status,
        acceptedAt: updatedLink.accepted_at,
      },
    });
  } catch (error) {
    console.error('[ca-links-patch] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/ca/links/[id] - Shop owner revokes CA access
export async function DELETE(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user (must be the shop owner who created the link)
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: linkId } = params;

    // Get and verify link was created by this user
    const { data: link, error: linkGetError } = await supabase
      .from('ca_client_links')
      .select('*')
      .eq('id', linkId)
      .eq('created_by', user.id)
      .single();

    if (linkGetError || !link) {
      return Response.json(
        { error: 'Link not found or not created by you' },
        { status: 404 }
      );
    }

    // Delete link
    const { error: deleteError } = await supabase
      .from('ca_client_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'CA access revoked',
    });
  } catch (error) {
    console.error('[ca-links-delete] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
