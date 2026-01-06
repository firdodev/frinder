import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { subject, message } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
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

    // Send emails individually
    let sent = 0;
    let failed = 0;
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject,
          text: message
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }
    return NextResponse.json({ success: true, sent, failed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send email.' }, { status: 500 });
  }
}