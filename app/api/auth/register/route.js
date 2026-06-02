import { createClient } from '@supabase/supabase-js';
import { getSafeErrorMessage } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, password, name, firmId } = await req.json();

    if (!email || !password || !name || !firmId) {
      return Response.json(
        { error: 'Email, password, name, and Firm ID are required' },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return Response.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      );
    }

    // Validate password strength (must have uppercase, number, special char)
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);

    if (!hasUppercase || !hasNumber || !hasSpecial) {
      return Response.json(
        { error: 'Password must contain uppercase letter, number, and special character (!@#$%^&*)' },
        { status: 400 }
      );
    }

    // Validate firm exists
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('id, name')
      .eq('id', firmId)
      .single();

    if (firmError || !firm) {
      return Response.json(
        { error: 'Invalid Firm ID. Please check with your firm admin.' },
        { status: 400 }
      );
    }

    // Check for duplicate request (same email + firmId)
    const { data: existingRequest } = await supabase
      .from('firm_join_requests')
      .select('id, status')
      .eq('email', email)
      .eq('firm_id', firmId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'rejected') {
        return Response.json(
          { error: 'Your previous request for this firm was rejected. Contact the firm admin.' },
          { status: 400 }
        );
      }
      return Response.json(
        { error: 'A request for this firm already exists for this email.' },
        { status: 400 }
      );
    }

    // Check if user already has an account
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    let userId;

    if (existingUser && !userError) {
      userId = existingUser.id;
      // Check if already a member of this firm
      const { data: existingMember } = await supabase
        .from('firm_members')
        .select('id, status')
        .eq('firm_id', firmId)
        .eq('user_id', userId)
        .single();

      if (existingMember?.status === 'active') {
        return Response.json(
          { error: 'You are already an active member of this firm.' },
          { status: 400 }
        );
      }
    } else {
      // Create new Supabase user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error('[register] Create user error:', createError);
        return Response.json(
          { error: getSafeErrorMessage(createError) },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // Create join request
    const { error: reqError } = await supabase
      .from('firm_join_requests')
      .insert({
        firm_id: firmId,
        user_id: userId,
        email,
        name,
        status: 'pending',
        role: 'staff',
      });

    if (reqError) {
      console.error('[register] Insert join request error:', reqError);
      return Response.json(
        { error: 'Failed to submit join request' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: `Request submitted to join "${firm.name}". Your firm admin will approve your access.`,
    });
  } catch (error) {
    console.error('[register] Error:', error);
    return Response.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
