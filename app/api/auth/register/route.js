export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { getSafeErrorMessage } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, password, name, firmId } = await req.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: 'Email, password, and name are required' },
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

    // Try to create user
    let userId;
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      if (createError.message?.toLowerCase().includes('already exists')) {
        // User already exists - for trial flow this is ok, for join flow check membership
        if (firmId) {
          return Response.json(
            { error: 'This email is already registered. Please sign in or use a different email.' },
            { status: 400 }
          );
        }
        // For trial flow, tell user to login
        return Response.json(
          { error: 'This email is already registered. Please sign in to continue.' },
          { status: 400 }
        );
      }
      console.error('[register] Create user error:', createError);
      return Response.json(
        { error: getSafeErrorMessage(createError) },
        { status: 500 }
      );
    }

    userId = newUser.user.id;

    // TRIAL FLOW: No firmId provided - create trial account
    if (!firmId) {
      try {
        // Auto-create a trial firm
        const { data: trialFirm, error: firmCreateError } = await supabase
          .from('firms')
          .insert({
            name: `${name}'s Business`,
          })
          .select()
          .single();

        if (firmCreateError || !trialFirm) {
          console.error('[register] Trial firm creation error:', firmCreateError);
          return Response.json(
            { error: 'Failed to create trial account' },
            { status: 500 }
          );
        }

        // Add user as owner of trial firm
        const { error: memberError } = await supabase
          .from('firm_members')
          .insert({
            firm_id: trialFirm.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
          });

        if (memberError) {
          console.error('[register] Add member error:', memberError);
          return Response.json(
            { error: 'Failed to set up trial account' },
            { status: 500 }
          );
        }

        // Create firm settings for trial
        const { error: settingsError } = await supabase
          .from('firm_settings')
          .insert({
            firm_id: trialFirm.id,
            user_id: userId,
            name: `${name}'s Business`,
          });

        if (settingsError) {
          console.error('[register] Firm settings error:', settingsError);
        }

        // Create trial limits record
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

        const { error: trialError } = await supabase
          .from('trial_limits')
          .insert({
            user_id: userId,
            is_trial: true,
            trial_started_at: new Date(),
            trial_ends_at: trialEndsAt,
            subscription_plan: 'free_trial',
            ai_scans_limit: 10,
            eway_files_limit: 5,
            einvoice_files_limit: 5,
            firm_count_limit: 1,
            current_month_starts_at: new Date(),
          });

        if (trialError) {
          console.error('[register] Trial limits creation error:', trialError);
          return Response.json(
            { error: 'Failed to set up trial limits' },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: 'Welcome to Shopos! Your 14-day free trial has started. All premium features are available during your trial period.',
          trialEndsAt: trialEndsAt.toISOString(),
        });
      } catch (trialError) {
        console.error('[register] Trial setup error:', trialError);
        return Response.json(
          { error: 'Failed to set up trial account' },
          { status: 500 }
        );
      }
    }

    // EXISTING FLOW: firmId provided - create join request
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
