export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = `Shopos <${process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in'}>`;

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || 'rohitgarg090@gmail.com,info@shopos.co.in')
      .split(',')
      .map(e => e.trim().toLowerCase());

    if (!adminEmails.includes((user.email || '').toLowerCase())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch demo requests
    const { data, error } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[demo-request] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error('[demo-request] GET error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { name, email, contact_number, city, company_name, message } = await req.json();

    // Validate required fields
    if (!name || !email || !contact_number || !city) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate contact number (basic check for Indian numbers)
    const contactRegex = /^(\+91)?[6-9]\d{9}$/;
    const cleanContact = contact_number.replace(/\D/g, '');
    if (!contactRegex.test(cleanContact)) {
      return NextResponse.json(
        { error: 'Invalid contact number' },
        { status: 400 }
      );
    }

    // Save demo request to database
    const { data, error: dbError } = await supabase
      .from('demo_requests')
      .insert([{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        contact_number: cleanContact,
        city: city.trim(),
        company_name: company_name?.trim() || null,
        message: message?.trim() || null,
        status: 'pending',
      }])
      .select()
      .single();

    if (dbError) {
      console.error('[demo-request] DB error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save demo request' },
        { status: 500 }
      );
    }

    console.log('[demo-request] Saved:', { name, email, contact_number: cleanContact, city });

    // Send confirmation email to client
    console.log('[demo-request] Sending client email to:', email, 'From:', FROM_EMAIL);
    try {
      const clientRes = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '📅 Demo Request Received - Shopos',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 32px; font-weight: 800; color: white; letter-spacing: -1px;">
                shop<span style="color: #60a5fa;">os</span>
              </div>
              <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 8px 0 0 0;">Complete Wholesale ERP Solution</p>
            </div>

            <div style="padding: 30px;">
              <h2 style="color: #0a0a0f; margin: 0 0 10px 0;">Hello ${name},</h2>
            <p>Thank you for your interest in Shopos! We've received your demo request.</p>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Contact Number:</strong> ${contact_number}</p>
              <p><strong>City:</strong> ${city}</p>
              ${company_name ? `<p><strong>Company:</strong> ${company_name}</p>` : ''}
            </div>

            <p>Our team will reach out to you within 24 hours to schedule your personalized demo.</p>

            <p>If you have any questions in the meantime, feel free to contact us at ${FROM_EMAIL}</p>

            <p>Best regards,<br><strong>The Shopos Team</strong></p>
          </div>
        `,
      });
      console.log('[demo-request] Client email sent:', clientRes);
    } catch (emailError) {
      console.error('[demo-request] Error sending client email:', emailError.message);
    }

    // Send notification email to admin
    console.log('[demo-request] Sending admin email to: info@shopos.co.in, rohitgarg090@gmail.com');
    try {
      const adminRes = await resend.emails.send({
        from: FROM_EMAIL,
        to: ['info@shopos.co.in', 'rohitgarg090@gmail.com'],
        subject: `🎯 New Demo Request: ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 32px; font-weight: 800; color: white; letter-spacing: -1px;">
                shop<span style="color: #60a5fa;">os</span>
              </div>
              <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 8px 0 0 0;">Complete Wholesale ERP Solution</p>
            </div>

            <div style="padding: 30px;">
              <h2 style="color: #0a0a0f; margin: 0 0 10px 0;">New Demo Request</h2>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Customer Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Contact Number:</strong> ${contact_number}</p>
              <p><strong>City:</strong> ${city}</p>
              ${company_name ? `<p><strong>Company:</strong> ${company_name}</p>` : ''}
              ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            </div>

            <p><strong>Status:</strong> Pending - Follow up required</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-IN')}</p>

            <p><a href="https://shopos.co.in/admin#demo-requests" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Admin Panel</a></p>
          </div>
        `,
      });
      console.log('[demo-request] Admin email sent:', adminRes);
    } catch (emailError) {
      console.error('[demo-request] Error sending admin email:', emailError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully. Check your email for confirmation.',
      demoRequestId: data.id,
    }, { status: 201 });

  } catch (error) {
    console.error('[demo-request] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
