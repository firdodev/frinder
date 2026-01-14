import { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'frinder-1242e',
      clientEmail: 'firebase-adminsdk-fbsvc@frinder-1242e.iam.gserviceaccount.com',
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
        `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDKdWSC//a4j4/X\nvAVI9mLgKF56k0declP8zmDj7bh1xHDdZiua3C56Pw6oYC3IM2hXScUta7iZXPV2\n18wPJQtHQjxRjlgteh56XkA5OMKOZeJGzoAhw2a7+EB0F/2senIbsVn/bZFjiQDR\nfMWG0FWcW0HA1SBPNyWIzcZi1DFRUq4hfuZtMruCmbOpbmGRDbWZhzoYnXINRLRc\nSXeXH55mRI+NQFlh+fsHGHnNqN131RVqMHiwYiiE1DWHR5XWuUo2C1qWYtXa2AaJ\n7qqTBnEriXw6jjkd78esDldgmIo24SJNELzH9ecSpTU33iRawIrMEpUQHY7iHPpv\nZKiTuBB/AgMBAAECggEAYIC1YMXuTcnMaCosoLskpTFI24dxOOEpDHM49twclTIG\nFFo7hazXEJkW/QYfPHLYlObKcFyM2LlZHYU+NKfVKOm3A67kdATmGzDqzvuxrRt+\nUH7kz3Mq+IUb/9phpcGVu4J9YgXRi87Fj5U4OAr9C7Lp9CcCqA+iugNPwVLgkSCN\nTmT84Zn3h8N03KVOPkPOe9Nqe+FHTxXTWbzd12JIfG/gMcmPCAHD6K0elE4qhDkv\nFluQaVJPCKfPNtu1E2FgUgC0+FTnosVHr6UOCYGJz627Y37Ee0Bvo1d9I2+suNjX\nw/g2v0CE0FZnyDqjfuuH7SbviLLZl5xVUpuloDahMQKBgQDrORJHXtzA1/zUEgPI\n8WCu7lGKxVyjgIHc1YELaQfkMBuQDZp9W/QbcEiLp4DSLysgLnwK3JYlNzc6cqAz\nkMqZPbPAC59WF66TXZ5wKzDDDrQStkHA4wf5/2NuZfsN3SoQYrNT1+bdo6cryXSK\n11agloYkMuubiO3WgYU81JvCDwKBgQDcV3GhW6pPE8vBjULqtWJShVEYOzTydRna\nXqEwM+j+BgUIe63u2/a0giX0kgmmdRZiNtw8+k/LRi5+F9BMTCpDaGaPT3pUhAx2\n6BNbsXl3mxXwbfIN4hrfHpCkIAPBD7auBymO6vWR/xmSNHuKckHa1Gj82rNgTSqw\n5W+r9rx6kQKBgChhtNyh0X4d1l7F9PZjUfjWGxOazEuZfTHfSXcfAebPx3uUikgp\nKCApx5qKGBh9VocA0/S9Z91dvFKBaTVRDyb9q8U1eZY7HJJaCSAymf1yocFwnpsx\nnqXxjS1fvpjjthv4BddIAm9ccA+ZVzOawllxXfgK8d3SxRoFRE1sJo1LAoGBALMt\nFIT/Un3dfiqVoZ3VA/BQ4wIOW17yZKSToQXeoI+4+2zLjkQXcQWWdCDuhJRs0Ffr\nfqrDbhHBr1rwKH1yzkdkZUoSekqx2qTy0ZMVvc3KOkv6TASIIgvgAgTE1+ity4K2\n5k+Gt00SoYuny/JoOS8m3X0IpycfeSDCYk33ZYtRAoGAMomfhm4Ne58SlU5cynGC\nhJFLd5Q0o2GFi0cZDnbrG/pTiZnQF2/q4Z4d9XN2y1IKTrK4WrEE78FgA3Ew10JF\nVm4cGNjxBphsfl1aOXaGUYTppgfthga6UlpG3Wd51DegTjP6LDCUXThbCE2wdh75\nIQ2Q0/M8V/fPfT3CbfShlNY=\n-----END PRIVATE KEY-----\n`
    })
  });
}

const db = admin.firestore();

// Delete documents in batches for efficiency
async function batchDelete(docRefs: admin.firestore.DocumentReference[]) {
  const batchSize = 500;
  for (let i = 0; i < docRefs.length; i += batchSize) {
    const batch = db.batch();
    docRefs.slice(i, i + batchSize).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const progress: { step: string; details: string }[] = [];
  const stats = {
    authUsersDeleted: 0,
    firestoreUsersDeleted: 0,
    matchesDeleted: 0,
    swipesDeleted: 0,
    creditsDeleted: 0,
    subscriptionsDeleted: 0,
    messagesDeleted: 0,
    inactiveUsersDeleted: 0
  };

  try {
    // Step 1: Get all Auth users
    progress.push({ step: '1/8', details: 'Fetching Auth users...' });
    const authUsers: { uid: string; email: string | undefined }[] = [];
    let nextPageToken: string | undefined = undefined;
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      authUsers.push(...result.users.map(u => ({ uid: u.uid, email: u.email })));
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Step 2: Get all Firestore users with their data
    progress.push({ step: '2/8', details: 'Fetching Firestore users...' });
    const usersSnap = await db.collection('users').get();
    const firestoreUsers = usersSnap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    const firestoreUserIds = new Set(firestoreUsers.map(u => u.id));
    const authUidSet = new Set(authUsers.map(u => u.uid));

    // Step 3: Find orphaned Auth users (in Auth but not in Firestore)
    progress.push({ step: '3/8', details: 'Finding orphaned Auth accounts...' });
    const orphanedAuthUsers = authUsers.filter(u => !firestoreUserIds.has(u.uid));
    
    // Step 4: Find orphaned Firestore users (in Firestore but not in Auth)
    progress.push({ step: '4/8', details: 'Finding orphaned Firestore users...' });
    const orphanedFirestoreUsers = firestoreUsers.filter(u => !authUidSet.has(u.id));

    // Step 5: Find inactive users (no photos, no matches, profile incomplete)
    progress.push({ step: '5/8', details: 'Finding inactive users...' });
    const matchesSnap = await db.collection('matches').get();
    const usersWithMatches = new Set<string>();
    matchesSnap.docs.forEach(doc => {
      const users = doc.data().users || [];
      users.forEach((uid: string) => usersWithMatches.add(uid));
    });

    const inactiveUsers = firestoreUsers.filter(u => {
      const data = u.data;
      const hasPhotos = data.photos && data.photos.length > 0 && data.photos.some((p: string) => p && !p.includes('placeholder') && p !== 'solid-black');
      const hasMatches = usersWithMatches.has(u.id);
      const isProfileComplete = data.isProfileComplete;
      const isDeleted = data.isDeleted;
      
      // User is inactive if: no valid photos AND no matches AND profile not complete OR marked as deleted
      return (!hasPhotos && !hasMatches && !isProfileComplete) || isDeleted;
    });

    // Collect all UIDs to delete
    const uidsToDelete = new Set([
      ...orphanedAuthUsers.map(u => u.uid),
      ...orphanedFirestoreUsers.map(u => u.id),
      ...inactiveUsers.map(u => u.id)
    ]);

    // Step 6: Delete related data in parallel batches
    progress.push({ step: '6/8', details: `Cleaning up data for ${uidsToDelete.size} users...` });

    // Delete matches where user is involved
    const matchesToDelete: admin.firestore.DocumentReference[] = [];
    for (const matchDoc of matchesSnap.docs) {
      const users = matchDoc.data().users || [];
      if (users.some((uid: string) => uidsToDelete.has(uid))) {
        // Delete messages in the match first
        const messagesSnap = await db.collection('matches').doc(matchDoc.id).collection('messages').get();
        stats.messagesDeleted += messagesSnap.size;
        await batchDelete(messagesSnap.docs.map(d => d.ref));
        matchesToDelete.push(matchDoc.ref);
      }
    }
    await batchDelete(matchesToDelete);
    stats.matchesDeleted = matchesToDelete.length;

    // Delete swipes involving these users (batch queries)
    const swipesToDelete: admin.firestore.DocumentReference[] = [];
    for (const uid of uidsToDelete) {
      const fromSwipes = await db.collection('swipes').where('fromUserId', '==', uid).get();
      const toSwipes = await db.collection('swipes').where('toUserId', '==', uid).get();
      swipesToDelete.push(...fromSwipes.docs.map(d => d.ref));
      swipesToDelete.push(...toSwipes.docs.map(d => d.ref));
    }
    await batchDelete(swipesToDelete);
    stats.swipesDeleted = swipesToDelete.length;

    // Step 7: Delete user-related collections
    progress.push({ step: '7/8', details: 'Deleting user accounts and subscriptions...' });
    
    const creditsToDelete: admin.firestore.DocumentReference[] = [];
    const subsToDelete: admin.firestore.DocumentReference[] = [];
    const proSuperLikesToDelete: admin.firestore.DocumentReference[] = [];
    const usersToDelete: admin.firestore.DocumentReference[] = [];

    for (const uid of uidsToDelete) {
      creditsToDelete.push(db.collection('userCredits').doc(uid));
      subsToDelete.push(db.collection('userSubscriptions').doc(uid));
      proSuperLikesToDelete.push(db.collection('proSuperLikes').doc(uid));
      usersToDelete.push(db.collection('users').doc(uid));
    }

    await batchDelete(creditsToDelete);
    stats.creditsDeleted = creditsToDelete.length;
    
    await batchDelete(subsToDelete);
    stats.subscriptionsDeleted = subsToDelete.length;
    
    await batchDelete(proSuperLikesToDelete);
    await batchDelete(usersToDelete);
    stats.firestoreUsersDeleted = usersToDelete.length;

    // Step 8: Delete from Firebase Auth
    progress.push({ step: '8/8', details: 'Deleting Auth accounts...' });
    const authUidsToDelete = [...uidsToDelete].filter(uid => authUidSet.has(uid));
    
    // Delete auth users in smaller batches to avoid rate limits
    for (let i = 0; i < authUidsToDelete.length; i += 10) {
      const batch = authUidsToDelete.slice(i, i + 10);
      await Promise.all(batch.map(uid => 
        admin.auth().deleteUser(uid).catch(() => {})
      ));
    }
    stats.authUsersDeleted = authUidsToDelete.length;
    stats.inactiveUsersDeleted = inactiveUsers.length;

    return res.status(200).json({ 
      success: true, 
      stats,
      deletedCount: uidsToDelete.size,
      progress
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ 
      error: (error as any).message || 'Failed to clean up users',
      progress,
      stats
    });
  }
}
