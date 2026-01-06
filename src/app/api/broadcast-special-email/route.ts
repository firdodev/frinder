import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import nodemailer from 'nodemailer';

// Helper to send a single email
async function sendEmail(to: string, subject: string, message: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: message
  };
  await transporter.sendMail(mailOptions);
}

export async function POST(req: NextRequest) {
  try {
    const { type } = await req.json();
    let subject = '';
    let message = '';
    if (type === 'thank') {
      subject = 'Thank you for using Frinder!';
      message = `We appreciate you being part of Frinder. If you enjoy the app, please share it with your friends!`;
    } else if (type === 'bug') {
      subject = 'Have you found any bugs?';
      message = `We want to make Frinder better! If you have found any bugs or issues, please reply to this email and let us know.`;
    } else {
      return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
    }

    // Fetch all users with a valid email
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const emails: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.isEmailVerified !== false) {
        emails.push(data.email);
      }
    });

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No users with valid emails found.' }, { status: 404 });
    }

    // Send emails individually
    let sent = 0;
    let failed = 0;
    for (const email of emails) {
      try {
        await sendEmail(email, subject, message);
        sent++;
      } catch (e) {
        failed++;
      }
    }
    return NextResponse.json({ success: true, sent, failed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send emails.' }, { status: 500 });
  }
}
