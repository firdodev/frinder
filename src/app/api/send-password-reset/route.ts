import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { email, resetLink } = await req.json();
    if (!email || !resetLink) {
      return NextResponse.json({ error: 'Missing email or reset link.' }, { status: 400 });
    }

    const result = await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
            <p style="color: #666; margin-top: 5px;">Find your match</p>
          </div>
          <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1a1a1a; margin-bottom: 10px;">Password Reset Request</h2>
            <p style="color: #666; margin-bottom: 20px;">You requested a password reset for your Frinder account.</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #ed8c00; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
              Reset Password
            </a>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send password reset email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send password reset email.' }, { status: 500 });
  }
}
