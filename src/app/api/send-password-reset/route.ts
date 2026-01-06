import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, resetLink } = await req.json();
    if (!email || !resetLink) {
      return NextResponse.json({ error: 'Missing email or reset link.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // For development only
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset for your Frinder account.</p>
             <p><a href="${resetLink}">Click here to reset your password</a></p>
             <p>If you did not request this, you can ignore this email.</p>`
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send password reset email.' }, { status: 500 });
  }
}
