'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Sparkles, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { addSuperLikes, purchasePremium } from '@/lib/firebaseServices';
import { toast } from 'sonner';

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [credited, setCredited] = useState(false);

  const paymentStatus = searchParams?.get('status');
  const receiptId = searchParams?.get('receipt_id');
  const planId = searchParams?.get('plan_id');

  useEffect(() => {
    if (paymentStatus === 'success') {
      setStatus('success');
      
      // Credit purchase to user based on plan ID
      if (user?.uid && !credited) {
        setCredited(true);
        
        // Check which plan was purchased
        if (planId === 'plan_TJw6Ei5VYZy7V') {
          // Frinder Pro subscription
          purchasePremium(user.uid)
            .then(() => {
              toast.success('Welcome to Frinder Pro! 👑');
            })
            .catch((error) => {
              console.error('Error activating subscription:', error);
            });
        } else {
          // Super Likes purchase (default)
          addSuperLikes(user.uid, 5)
            .then(() => {
              toast.success('5 Super Likes added to your account! 💙');
            })
            .catch((error) => {
              console.error('Error crediting super likes:', error);
            });
        }
      }
    } else if (paymentStatus === 'error') {
      setStatus('error');
    } else {
      // No status param, assume loading or redirect
      setStatus('loading');
      setTimeout(() => {
        if (!paymentStatus) {
          router.push('/');
        }
      }, 2000);
    }
  }, [paymentStatus, user?.uid, credited, router, planId]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleTryAgain = () => {
    router.push('/?shop=true');
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-black flex items-center justify-center p-4'>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className='w-full max-w-md shadow-2xl'>
          <CardContent className='pt-8 pb-8 text-center'>
            {status === 'loading' && (
              <div className='space-y-4'>
                <div className='w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
                  <Loader2 className='w-8 h-8 text-frinder-orange animate-spin' />
                </div>
                <h2 className='text-xl font-bold dark:text-white'>Processing...</h2>
                <p className='text-muted-foreground'>Please wait while we confirm your payment.</p>
              </div>
            )}

            {status === 'success' && (
              <div className='space-y-4'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className='w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'
                >
                  <Check className='w-10 h-10 text-green-500' />
                </motion.div>
                
                <h2 className='text-2xl font-bold dark:text-white'>Payment Successful!</h2>
                
                {planId === 'plan_TJw6Ei5VYZy7V' ? (
                  // Frinder Pro subscription success
                  <>
                    <div className='flex items-center justify-center gap-2 py-4'>
                      <Crown className='w-6 h-6 text-frinder-orange fill-frinder-orange' />
                      <span className='text-lg font-semibold text-frinder-orange'>Frinder Pro Activated!</span>
                      <Crown className='w-6 h-6 text-frinder-orange fill-frinder-orange' />
                    </div>
                    
                    <p className='text-muted-foreground'>
                      You now have access to all Pro features including 15 monthly Super Likes, no ads, priority discovery, and advanced filters!
                    </p>
                  </>
                ) : (
                  // Super Likes purchase success
                  <>
                    <div className='flex items-center justify-center gap-2 py-4'>
                      <Star className='w-6 h-6 text-blue-500 fill-blue-500' />
                      <span className='text-lg font-semibold text-blue-500'>+5 Super Likes</span>
                      <Star className='w-6 h-6 text-blue-500 fill-blue-500' />
                    </div>
                    
                    <p className='text-muted-foreground'>
                      Your Super Likes have been added to your account. Use them to stand out and get more matches!
                    </p>
                  </>
                )}

                {receiptId && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    Receipt: {receiptId}
                  </p>
                )}

                <Button 
                  onClick={handleGoHome}
                  className='w-full mt-4 bg-frinder-orange hover:bg-frinder-orange/90'
                >
                  <Sparkles className='w-4 h-4 mr-2' />
                  Start Swiping
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className='space-y-4'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className='w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'
                >
                  <X className='w-10 h-10 text-red-500' />
                </motion.div>
                
                <h2 className='text-2xl font-bold dark:text-white'>Payment Failed</h2>
                
                <p className='text-muted-foreground'>
                  Something went wrong with your payment. Please try again.
                </p>

                <div className='flex gap-2 mt-4'>
                  <Button 
                    onClick={handleGoHome}
                    variant='outline'
                    className='flex-1'
                  >
                    Go Home
                  </Button>
                  <Button 
                    onClick={handleTryAgain}
                    className='flex-1 bg-frinder-orange hover:bg-frinder-orange/90'
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function CheckoutLoadingFallback() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-black flex items-center justify-center p-4'>
      <Card className='w-full max-w-md shadow-2xl'>
        <CardContent className='pt-8 pb-8 text-center'>
          <div className='space-y-4'>
            <div className='w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
              <Loader2 className='w-8 h-8 text-frinder-orange animate-spin' />
            </div>
            <h2 className='text-xl font-bold dark:text-white'>Loading...</h2>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<CheckoutLoadingFallback />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
