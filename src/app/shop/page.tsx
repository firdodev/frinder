'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { WhopCheckoutEmbed, useCheckoutEmbedControls } from '@whop/checkout/react';
import { 
  addSuperLikes, 
  purchasePremium, 
  purchaseAdFree,
  subscribeToUserSubscription,
  type UserSubscription
} from '@/lib/firebaseServices';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Crown,
  Star,
  Zap,
  Shield,
  Check,
  Ban,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  whopPlanId: string;
  highlight?: boolean;
  features?: string[];
}

export default function ShopPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { darkMode } = useSettings();
  const [view, setView] = useState<'main' | 'checkout'>('main');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const checkoutRef = useCheckoutEmbedControls();

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToUserSubscription(user.uid, (subscription) => {
      setUserSubscription(subscription);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const products: Product[] = [
    {
      id: 'pro',
      name: 'Frinder Pro',
      description: 'Unlimited features',
      price: '€5',
      priceNote: '/mo',
      icon: <Crown className='w-5 h-5 text-frinder-orange' />,
      color: 'bg-frinder-orange',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      whopPlanId: 'plan_TJw6Ei5VYZy7V',
      highlight: true,
      features: ['15 Super Likes/month', 'No Ads', 'Priority Discovery', 'Advanced Filters']
    },
    {
      id: 'superlikes',
      name: '5 Super Likes',
      description: 'Stand out from the crowd',
      price: '$2',
      icon: <Star className='w-5 h-5 text-blue-500' />,
      color: 'bg-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      whopPlanId: 'plan_zXVOFdbd4E68R',
      features: ['5 Super Likes', 'Use anytime', 'Get noticed faster', 'Higher match rate']
    }
  ];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setView('checkout');
  };

  const handleBack = () => {
    setView('main');
    setSelectedProduct(null);
  };

  const handleClose = () => {
    router.back();
  };

  const handleCheckoutComplete = async () => {
    if (!user?.uid || !selectedProduct) return;
    
    try {
      if (selectedProduct.id === 'pro') {
        await purchasePremium(user.uid);
        toast.success('Welcome to Frinder Pro! 🎉', {
          description: 'All premium features are now unlocked.'
        });
      } else if (selectedProduct.id === 'removeads') {
        await purchaseAdFree(user.uid);
        toast.success('Ads removed! 🎉', {
          description: 'Enjoy your ad-free experience.'
        });
      } else {
        await addSuperLikes(user.uid, 5);
        toast.success('Super Likes added! ⭐', {
          description: 'You received 5 Super Likes.'
        });
      }
      
      router.back();
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase. Please contact support.');
    }
  };

  const getReturnUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/checkout/complete?plan_id=${selectedProduct?.whopPlanId || ''}`;
  };

  const isProductActive = (productId: string): boolean => {
    if (productId === 'pro') return userSubscription?.isPremium || false;
    if (productId === 'removeads') return userSubscription?.isAdFree || false;
    return false;
  };

  return (
    <div className='fixed inset-0 w-screen h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden'>
      <AnimatePresence mode='wait'>
        {view === 'main' ? (
          <motion.div
            key='shop-main'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className='flex flex-col h-full w-full'
          >
            {/* Header */}
            <div className='flex-shrink-0 bg-frinder-orange px-4 pt-4 pb-5'>
              <div className='max-w-lg mx-auto'>
                <button 
                  onClick={handleClose}
                  className='w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mb-3'
                >
                  <ArrowLeft className='w-5 h-5 text-white' />
                </button>
                
                <h1 className='text-xl font-bold text-white'>Shop</h1>
                <p className='text-white/80 text-sm'>Boost your dating game</p>
              </div>
            </div>

            {/* Products */}
            <div className='flex-1 overflow-y-auto overscroll-contain'>
              <div className='max-w-lg mx-auto p-4 space-y-3'>
                {products.map((product, index) => (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectProduct(product)}
                    disabled={isProductActive(product.id)}
                    className={`
                      w-full bg-white dark:bg-gray-900 rounded-xl p-4 text-left transition-all border border-gray-200 dark:border-gray-800
                      ${isProductActive(product.id)
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-gray-300 dark:hover:border-gray-700 active:scale-[0.99]'
                      }
                      ${product.highlight && !isProductActive(product.id) ? 'ring-2 ring-frinder-orange' : ''}
                    `}
                  >
                    <div className='flex items-center gap-3'>
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl ${product.iconBg} flex items-center justify-center flex-shrink-0`}>
                        {product.icon}
                      </div>
                      
                      {/* Info */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <h3 className='font-semibold text-gray-900 dark:text-white'>{product.name}</h3>
                          {product.highlight && !isProductActive(product.id) && (
                            <span className='text-[10px] font-bold text-frinder-orange bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded'>
                              BEST
                            </span>
                          )}
                          {isProductActive(product.id) && (
                            <span className='text-[10px] font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded flex items-center gap-0.5'>
                              <Check className='w-2.5 h-2.5' /> Active
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>{product.description}</p>
                      </div>
                      
                      {/* Price & Arrow */}
                      <div className='flex items-center gap-2 flex-shrink-0'>
                        <div className='text-right'>
                          <span className='font-bold text-gray-900 dark:text-white'>{product.price}</span>
                          {product.priceNote && (
                            <span className='text-xs text-gray-500 dark:text-gray-400'>{product.priceNote}</span>
                          )}
                        </div>
                        {!isProductActive(product.id) && (
                          <ChevronRight className='w-4 h-4 text-gray-400' />
                        )}
                      </div>
                    </div>
                    
                    {/* Features preview - only for Pro */}
                    {product.id === 'pro' && product.features && !isProductActive(product.id) && (
                      <div className='mt-3 pt-3 border-t border-gray-100 dark:border-gray-800'>
                        <div className='flex flex-wrap gap-2'>
                          {product.features.map((feature, i) => (
                            <span key={i} className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                              <Check className='w-3 h-3 text-emerald-500' />
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.button>
                ))}

                {/* Trust badges */}
                <div className='flex items-center justify-center gap-4 pt-4 pb-2'>
                  <div className='flex items-center gap-1.5 text-xs text-gray-400'>
                    <Shield className='w-3.5 h-3.5' />
                    <span>Secure payment</span>
                  </div>
                  <div className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700' />
                  <div className='flex items-center gap-1.5 text-xs text-gray-400'>
                    <Zap className='w-3.5 h-3.5' />
                    <span>Instant delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key='checkout'
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className='flex flex-col h-full w-full'
          >
            {/* Checkout Header */}
            <div className={`flex-shrink-0 px-4 pt-4 pb-4 ${selectedProduct?.color || 'bg-gray-500'}`}>
              <div className='max-w-lg mx-auto'>
                <button
                  onClick={handleBack}
                  className='w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mb-3'
                >
                  <ArrowLeft className='w-5 h-5 text-white' />
                </button>
                
                <h1 className='text-lg font-bold text-white'>{selectedProduct?.name}</h1>
                <p className='text-white/80 text-sm'>
                  {selectedProduct?.price}{selectedProduct?.priceNote || ''} • {selectedProduct?.description}
                </p>
              </div>
            </div>
            
            {/* Checkout embed */}
            <div className='flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-gray-950'>
              <div className='max-w-lg mx-auto min-h-[500px] p-4'>
                {selectedProduct?.whopPlanId && (
                  <WhopCheckoutEmbed
                    ref={checkoutRef}
                    planId={selectedProduct.whopPlanId}
                    returnUrl={getReturnUrl()}
                    theme={darkMode ? 'dark' : 'light'}
                    prefill={user?.email ? { email: user.email } : undefined}
                    onComplete={handleCheckoutComplete}
                    fallback={
                      <div className='flex flex-col items-center justify-center h-48 gap-3'>
                        <Loader2 className='w-6 h-6 animate-spin text-frinder-orange' />
                        <p className='text-sm text-gray-500'>Loading checkout...</p>
                      </div>
                    }
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
