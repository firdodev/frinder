import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailService';

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expires: number }>();

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, action, code } = await request.json();

    if (!email || !email.endsWith('@universitetipolis.edu.al')) {
      return NextResponse.json(
        { error: 'Invalid email. Only @universitetipolis.edu.al emails are allowed.' },
        { status: 400 }
      );
    }

    if (action === 'send') {
      const verificationCode = generateCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      verificationCodes.set(email, { code: verificationCode, expires });

      const result = await sendEmail({
        to: email,
        subject: 'Your Frinder Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
              <p style="color: #666; margin-top: 5px;">Find your match</p>
            </div>
            <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px; text-align: center;">
              <h2 style="color: #1a1a1a; margin-bottom: 10px;">Your Verification Code</h2>
              <p style="color: #666; margin-bottom: 20px;">Enter this code to verify your email</p>
              <div style="background-color: #ed8c00; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block;">
                ${verificationCode}
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes</p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        `,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to send verification email' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Verification code sent' });
    }

    if (action === 'verify') {
      const stored = verificationCodes.get(email);

      if (!stored) {
        return NextResponse.json({ error: 'No verification code found' }, { status: 400 });
      }

      if (Date.now() > stored.expires) {
        verificationCodes.delete(email);
        return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
      }

      if (stored.code !== code) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      verificationCodes.delete(email);
      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
