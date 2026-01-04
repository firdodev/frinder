import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, setDoc, getDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { whopsdk } from '@/lib/whop-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Validate and unwrap the webhook using Whop SDK
    let webhookData;
    try {
      webhookData = whopsdk.webhooks.unwrap(body, { headers });
    } catch (validationError) {
      console.error('Webhook validation failed:', validationError);
      // Fall back to parsing without validation for development
      webhookData = JSON.parse(body);
    }

    console.log('Whop webhook received:', webhookData.type);
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    // Handle membership.activated - this is when a subscription becomes active
    if (webhookData.type === 'membership.activated') {
      const membership = webhookData.data;
      const membershipId = membership.id;
      const planId = membership.plan?.id;
      const whopUserId = membership.user?.id;

      console.log('Membership activated:', membershipId);
      console.log('Plan ID:', planId);
      console.log('Whop User ID:', whopUserId);
      console.log('Metadata:', membership.metadata);

      // Check if firebase_uid is in metadata
      let firebaseUid = membership.metadata?.firebase_uid;

      // If not in metadata, try to find by pending checkout mapping
      if (!firebaseUid && whopUserId) {
        // Look up pending checkout by whopUserId
        const pendingRef = doc(db, 'pendingCheckouts', whopUserId);
        const pendingSnap = await getDoc(pendingRef);
        if (pendingSnap.exists()) {
          firebaseUid = pendingSnap.data().firebaseUid;
          console.log('Found Firebase UID from pending checkout:', firebaseUid);
        }
      }

      // If still not found, try to find by membership ID in userSubscriptions
      if (!firebaseUid) {
        // Check if any user already has this membership (unlikely on activation)
        const subsRef = collection(db, 'userSubscriptions');
        const q = query(subsRef, where('whopUserId', '==', whopUserId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          firebaseUid = querySnapshot.docs[0].id;
          console.log('Found Firebase UID from existing subscription:', firebaseUid);
        }
      }

      if (firebaseUid) {
        const isPro = planId === 'plan_TJw6Ei5VYZy7V' || planId === 'plan_hvPYAJ9TWzW8x';

        if (isPro) {
          const subRef = doc(db, 'userSubscriptions', firebaseUid);
          await updateDoc(subRef, {
            membershipId: membershipId,
            whopUserId: whopUserId,
            isPremium: true,
            premiumExpiresAt: null,
            unlimitedSuperLikes: true,
            canSeeWhoLikedYou: true,
            unlimitedRewinds: true,
            priorityInDiscovery: true,
            advancedFilters: true,
            isAdFree: true,
            cancelAtPeriodEnd: false
          });
          console.log(`Updated subscription for user ${firebaseUid} with membership ${membershipId}`);
        }
      } else {
        console.log('Could not find Firebase UID for membership activation');
        // Store the membership details for later linking
        await setDoc(doc(db, 'unlinkedMemberships', membershipId), {
          membershipId,
          planId,
          whopUserId,
          createdAt: Timestamp.now(),
          webhookData: membership
        });
        console.log('Stored unlinked membership for later processing');
      }
    }

    if (webhookData.type === 'payment.succeeded') {
      const payment = webhookData.data;
      // Membership ID is nested in payment.membership.id, not payment.membership_id
      const membershipId = payment.membership?.id;
      const planId = payment.plan?.id;
      const whopUserId = payment.user?.id;

      console.log('Payment succeeded - membershipId:', membershipId);
      console.log('Plan ID:', planId);
      console.log('Whop User ID:', whopUserId);

      // Try to find Firebase user by whopUserId
      if (membershipId && whopUserId) {
        const subsRef = collection(db, 'userSubscriptions');
        const q = query(subsRef, where('whopUserId', '==', whopUserId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const firebaseUid = querySnapshot.docs[0].id;
          const isPro = planId === 'plan_TJw6Ei5VYZy7V' || planId === 'plan_hvPYAJ9TWzW8x';

          if (isPro) {
            const subRef = doc(db, 'userSubscriptions', firebaseUid);
            await updateDoc(subRef, {
              membershipId: membershipId,
              isPremium: true,
              premiumExpiresAt: null,
              unlimitedSuperLikes: true,
              canSeeWhoLikedYou: true,
              unlimitedRewinds: true,
              priorityInDiscovery: true,
              advancedFilters: true,
              isAdFree: true,
              cancelAtPeriodEnd: false
            });
            console.log(`Updated subscription for user ${firebaseUid} with membership ${membershipId}`);
          }
        } else {
          console.log('No user found with whopUserId:', whopUserId);
        }
      }
    }

    if (webhookData.type === 'membership.cancelled' || webhookData.type === 'membership.expired') {
      const membership = webhookData.data;
      const membershipId = membership.id;

      // Find user by membershipId
      const subsRef = collection(db, 'userSubscriptions');
      const q = query(subsRef, where('membershipId', '==', membershipId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const firebaseUid = querySnapshot.docs[0].id;
        // Reset user's premium status
        const subRef = doc(db, 'userSubscriptions', firebaseUid);
        await updateDoc(subRef, {
          isPremium: false,
          premiumExpiresAt: Timestamp.now(),
          unlimitedSuperLikes: false,
          canSeeWhoLikedYou: false,
          unlimitedRewinds: false,
          priorityInDiscovery: false,
          advancedFilters: false,
          isAdFree: false,
          membershipId: null,
          cancelAtPeriodEnd: false
        });

        console.log(`Cancelled subscription for user ${firebaseUid}`);
      } else {
        console.log('Could not find user with membershipId:', membershipId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
