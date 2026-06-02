import { createClient } from '@supabase/supabase-js';
import { isAdminEmail, generateSecurePassword, getSafeErrorMessage } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(token) {
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = new URL(req.url).searchParams.get('status') || 'all';

    let query = supabase.from('organizations').select('*');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orgs, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Enrich with auth user emails
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        let userEmail = 'N/A';

        try {
          if (org.owner_id) {
            const {
              data: { user },
            } = await supabase.auth.admin.getUserById(org.owner_id);
            userEmail = user?.email || 'N/A';
          }
        } catch (e) {
          console.error('Error fetching user for org:', org.id, e);
        }

        const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
        const now = new Date();
        const trialDaysRemaining = org.status === 'trial' && trialEndsAt
          ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: org.id,
          name: org.name,
          email: userEmail,
          status: org.status,
          plan: org.plan,
          trialDaysRemaining,
          createdAt: org.created_at,
          owner_id: org.owner_id,
        };
      })
    );

    return Response.json({ organizations: enriched });
  } catch (error) {
    console.error('GET /admin/organizations error:', error);
    return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, businessName, phone, plan = 'trial' } = await req.json();

    if (!email || !businessName) {
      return Response.json(
        { error: 'Email and business name required' },
        { status: 400 }
      );
    }

    // 1. Generate temp password (secure random)
    const tempPassword = generateSecurePassword();

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      return Response.json({ error: getSafeErrorMessage(authError) }, { status: 400 });
    }

    const userId = authData.user.id;

    // 3. Create organization
    // Map plan to valid database values
    let orgPlan = 'starter';
    let orgStatus = 'trial';
    let trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (plan === 'free') {
      orgPlan = 'starter';
      orgStatus = 'active';
      trialEndsAt = null;
    } else if (plan === 'trial') {
      orgPlan = 'starter';
      orgStatus = 'trial';
      trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    } else if (['starter', 'business', 'pro', 'enterprise'].includes(plan)) {
      orgPlan = plan;
      orgStatus = 'active';
      trialEndsAt = null;
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        owner_id: userId,
        name: businessName,
        status: orgStatus,
        plan: orgPlan,
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (orgError) {
      return Response.json({ error: orgError.message }, { status: 500 });
    }

    // 4. Create firm
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .insert({
        name: businessName,
        owner_id: userId,
      })
      .select()
      .single();

    if (firmError) {
      return Response.json({ error: firmError.message }, { status: 500 });
    }

    // 5. Create firm member
    const { error: memberError } = await supabase
      .from('firm_members')
      .insert({
        firm_id: firm.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      return Response.json({ error: memberError.message }, { status: 500 });
    }

    // 6. Create firm settings
    const { error: settingsError } = await supabase
      .from('firm_settings')
      .insert({
        user_id: userId,
        firm_id: firm.id,
        name: businessName,
        mobile: phone || '',
      });

    if (settingsError) {
      return Response.json({ error: settingsError.message }, { status: 500 });
    }

    // 7. Generate magic link
    const { data: magicLinkData, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    });

    if (magicError) {
      console.error('Magic link error:', magicError);
    }

    return Response.json({
      success: true,
      userId,
      orgId: org.id,
      firmId: firm.id,
      email,
      businessName,
      tempPassword,
      magicLink: magicLinkData?.properties?.action_link || null,
      portalUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      plan: orgPlan,
      status: orgStatus,
      trialEndsAt,
    });
  } catch (error) {
    console.error('POST /admin/organizations error:', error);
    return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
