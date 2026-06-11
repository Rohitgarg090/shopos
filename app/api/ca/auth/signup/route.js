import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, password, name, phone, firmName, gstin, pan } = await req.json();

    // Validation
    if (!email || !password || !name || !phone) {
      return Response.json(
        { error: 'Email, password, name, and phone are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate phone format (10+ digits)
    const phoneRegex = /^\+?[0-9]{10,}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return Response.json(
        { error: 'Phone number must be at least 10 digits' },
        { status: 400 }
      );
    }

    // Create auth user with custom metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'ca_partner',
      },
    });

    if (authError) {
      console.error('[ca-signup] Auth creation error:', authError);
      if (authError.message.includes('already registered')) {
        return Response.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
      return Response.json(
        { error: authError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create CA partner profile
    const { data: caProfile, error: caError } = await supabase
      .from('ca_partners')
      .insert({
        user_id: authData.user.id,
        email,
        phone: phone.replace(/\s/g, ''),
        name,
        firm_name: firmName || null,
        gstin: gstin || null,
        pan: pan || null,
      })
      .select()
      .single();

    if (caError) {
      console.error('[ca-signup] CA profile creation error:', caError);
      // If CA profile fails, delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return Response.json(
        { error: caError.message || 'Failed to create CA profile' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'CA account created successfully',
      ca: {
        id: caProfile.id,
        email: caProfile.email,
        name: caProfile.name,
        phone: caProfile.phone,
      },
    });
  } catch (error) {
    console.error('[ca-signup] Error:', error);
    return Response.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
