import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, userId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Correct API URL - v1
    const response = await fetch(`https://api.whop.com/api/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('API Error:', error);
      return NextResponse.json({ error: 'Failed to fetch payment' }, { status: response.status });
    }

    const payment = await response.json();
    // Membership ID is nested in payment.membership.id, not payment.membership_id
    const membershipId = payment.membership?.id;
    const planId = payment.plan?.id;
    const whopUserId = payment.user?.id;

    console.log('Payment response:', JSON.stringify(payment, null, 2));
    console.log('Extracted membershipId:', membershipId);

    if (membershipId && userId) {
      const subRef = doc(db, 'userSubscriptions', userId);
      const isPro = planId === 'plan_TJw6Ei5VYZy7V' || planId === 'plan_hvPYAJ9TWzW8x';

      await setDoc(
        subRef,
        {
          membershipId,
          paymentId,
          whopUserId,
          ...(isPro && {
            isPremium: true,
            premiumExpiresAt: null,
            unlimitedSuperLikes: true,
            canSeeWhoLikedYou: true,
            unlimitedRewinds: true,
            priorityInDiscovery: true,
            advancedFilters: true,
            isAdFree: true,
            cancelAtPeriodEnd: false
          })
        },
        { merge: true }
      );

      console.log(`Saved membership ${membershipId} for user ${userId}`);
    }

    return NextResponse.json({ success: true, membershipId });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get membership' }, { status: 500 });
  }
}
