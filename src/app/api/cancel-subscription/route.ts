import Whop from '@whop/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const client = new Whop({
  apiKey: process.env.WHOP_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const { membershipId, userId } = await request.json();
    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    // Cancel the subscription at the end of the billing period
    await client.memberships.cancel(membershipId);

    // Update Firebase to mark subscription as pending cancellation
    if (userId) {
      const subRef = doc(db, 'userSubscriptions', userId);
      await updateDoc(subRef, {
        cancelAtPeriodEnd: true
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
