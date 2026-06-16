export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to send email via Resend API
async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[demo-request] Resend API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[demo-request] Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[demo-request] Email sending error:', error);
    return false;
  }
}

export async function POST(req) {
  try {
    const { name, email, contact_number, city, company_name, message } = await req.json();

    // Validate required fields
    if (!name || !email || !contact_number || !city) {
      return Response.json(
        { error: 'Name, email, contact number, and city are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate phone number (basic validation - at least 10 digits)
    const phoneDigits = contact_number.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 10) {
      return Response.json(
        { error: 'Contact number must be at least 10 digits' },
        { status: 400 }
      );
    }

    console.log('[demo-request] Saving demo request:', { name, email, city });

    // Save to database
    const { data: demoRequest, error: dbError } = await supabase
      .from('demo_requests')
      .insert({
        name,
        email,
        contact_number,
        city,
        company_name: company_name || null,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[demo-request] Database error:', dbError);
      return Response.json(
        { error: 'Failed to save demo request' },
        { status: 500 }
      );
    }

    console.log('[demo-request] Demo request saved:', demoRequest.id);

    // Send email to admin
    console.log('[demo-request] Sending email to admin...');
    await sendEmail({
      to: 'rohitgarg090@gmail.com',
      subject: `🎉 New Demo Request from ${name}`,
      html: `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contact Number:</strong> ${contact_number}</p>
        <p><strong>City:</strong> ${city}</p>
        ${company_name ? `<p><strong>Company:</strong> ${company_name}</p>` : ''}
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <p><strong>Request ID:</strong> ${demoRequest.id}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
        <hr>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/demo-requests">View in Admin Panel</a></p>
      `,
    });

    // Send confirmation email to user
    console.log('[demo-request] Sending confirmation email to user...');
    await sendEmail({
      to: email,
      subject: 'Demo Request Received - ShopOS',
      html: `
        <h2>Thank you for your interest in ShopOS! 🎉</h2>
        <p>Hi ${name},</p>
        <p>We've received your demo request and our team will reach out to you shortly at <strong>${contact_number}</strong>.</p>
        <p>In the meantime, here's what you can do:</p>
        <ul>
          <li><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}">Start your free trial immediately</a></li>
          <li>Explore our features with 14 days free access</li>
          <li>No credit card required</li>
        </ul>
        <p><strong>Request Details:</strong></p>
        <ul>
          <li>Request ID: ${demoRequest.id}</li>
          <li>Received at: ${new Date().toLocaleString('en-IN')}</li>
        </ul>
        <p>Best regards,<br>ShopOS Team</p>
      `,
    });

    return Response.json({
      success: true,
      message: 'Demo request received! We will contact you shortly.',
      request_id: demoRequest.id,
    });
  } catch (error) {
    console.error('[demo-request] Error:', error);
    return Response.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

// GET endpoint for admins to view demo requests
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    console.log('[demo-request] GET - Auth header present:', !!authHeader);

    if (!token) {
      console.log('[demo-request] GET - No token provided');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    console.log('[demo-request] GET - User check:', { hasUser: !!user, email: user?.email, error: userError?.message });

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || 'rohitgarg090@gmail.com,info@shopos.co.in')
      .split(',')
      .map(e => e.trim().toLowerCase());

    console.log('[demo-request] GET - Admin check:', { email: user.email, adminEmails, isAdmin: adminEmails.includes((user.email || '').toLowerCase()) });

    if (!adminEmails.includes((user.email || '').toLowerCase())) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get demo requests
    console.log('[demo-request] GET - Fetching demo requests');
    const { data: requests, error: fetchError } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('[demo-request] GET - Query result:', { count: requests?.length, error: fetchError?.message });

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    return Response.json({ requests });
  } catch (error) {
    console.error('[demo-request] GET error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
