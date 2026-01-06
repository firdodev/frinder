import { NextRequest, NextResponse } from 'next/server';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import nodemailer from 'nodemailer';

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

export async function POST(request: NextRequest) {
  try {
    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const emails: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      // Only users with 0 or 1 photo
      if (data.email && Array.isArray(data.photos) && data.photos.length <= 1) {
        emails.push(data.email);
      } else if (data.email && (!Array.isArray(data.photos) || data.photos.length === 0)) {
        emails.push(data.email);
      }
    });
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No incomplete profiles found.' }, { status: 404 });
    }

    const subject = 'Complete your Frinder profile for better matches!';
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2>Boost your Frinder experience!</h2>
      <p>Hi there,</p>
      <p>We noticed your profile could use a few more photos. The ideal number is <b>5 photos</b> to get more matches and better results!</p>
      <p>Try to swipe more and explore new connections. Update your profile now for the best experience!</p>
      <p><a href="https://frinder.co" style="color:#ed8c00;font-weight:bold;">Open Frinder</a></p>
      <p style="color:#999;font-size:12px;margin-top:30px;">This is an automated reminder from Frinder.</p>
    </div>`;

    // Send emails individually
    let sent = 0;
    let failed = 0;
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `Frinder <${process.env.EMAIL_USER}>`,
          to: email,
          subject,
          html
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error('Remind incomplete profiles error:', error);
    let errorMsg = '';
    if (typeof error === 'string') errorMsg = error;
    else if (error instanceof Error) errorMsg = error.message + (error.stack ? ('\n' + error.stack) : '');
    else errorMsg = JSON.stringify(error);
    return NextResponse.json({ error: errorMsg || 'Failed to send reminder email.' }, { status: 500 });
  }
}
