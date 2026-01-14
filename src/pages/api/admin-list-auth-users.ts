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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { nextPageToken } = req.body;
  try {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    return res.status(200).json({
      users: result.users.map(u => ({ uid: u.uid, email: u.email })),
      nextPageToken: result.pageToken || null
    });
  } catch (error) {
    return res.status(500).json({ error: (error as any).message || 'Failed to list users' });
  }
}
