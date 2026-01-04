'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Users, 
  MessageCircle, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  Check,
  Star,
  Zap,
  Globe,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const features = [
    {
      icon: Heart,
      title: 'Smart Matching',
      description: 'Our algorithm connects you with people who share your interests and are nearby',
      color: '#ed8c00'
    },
    {
      icon: Users,
      title: 'Group Activities',
      description: 'Join or create groups for study sessions, sports, events, and more',
      color: '#ffbe42'
    },
    {
      icon: MessageCircle,
      title: 'Instant Chat',
      description: 'Start real conversations with your matches right away',
      color: '#e8763d'
    },
    {
      icon: Lock,
      title: 'Verified & Safe',
      description: 'Email verification ensures real users and a safe community',
      color: '#cc5d00'
    }
  ];

  const testimonials = [
    {
      name: 'Sara M.',
      text: "I found my study group and best friends through Frinder. It's amazing!",
      avatar: '👩‍🎓'
    },
    {
      name: 'Andi K.',
      text: 'The matching algorithm actually works. Met someone who shares all my interests!',
      avatar: '👨‍💻'
    },
    {
      name: 'Elena B.',
      text: 'Finally an app that helps you make real connections, not just swipe endlessly.',
      avatar: '👩‍🎨'
    }
  ];

  const howItWorks = [
    { step: '1', title: 'Create Profile', description: 'Sign up and tell us about yourself' },
    { step: '2', title: 'Get Matched', description: 'We find people with similar interests near you' },
    { step: '3', title: 'Connect', description: 'Chat, meet up, and build real relationships' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className='min-h-screen bg-white overflow-x-hidden'>
      {/* Animated background gradient */}
      <div 
        className='fixed inset-0 pointer-events-none opacity-30'
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(237, 140, 0, 0.15), transparent 40%)`
        }}
      />

      {/* Navigation */}
      <nav className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between'>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className='flex items-center gap-2'
            >
              <img 
                src='/frinder-logo.png' 
                alt='Frinder - Find Friends & Meaningful Connections' 
                className='w-9 h-9 rounded-lg shadow-md shadow-orange-200/50'
              />
              <span className='text-2xl font-bold bg-gradient-to-r from-[#ed8c00] to-[#e8763d] bg-clip-text text-transparent'>
                Frinder
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button 
                onClick={onGetStarted} 
                className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:scale-105'
              >
                Get Started
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            {/* Hero Text */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className='text-center lg:text-left'
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className='inline-flex items-center gap-2 bg-orange-50 text-[#ed8c00] px-4 py-2 rounded-full text-sm font-medium mb-6'
              >
                <Sparkles className='w-4 h-4' />
                <span>Join thousands of people connecting daily</span>
              </motion.div>
              
              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6'>
                Find Your
                <span className='relative'>
                  <span className='relative z-10 text-[#ed8c00]'> Perfect Match</span>
                  <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className='absolute -bottom-2 left-0 w-full'
                    viewBox='0 0 200 12'
                    fill='none'
                  >
                    <path
                      d='M2 8C50 2 150 2 198 8'
                      stroke='#ffbe42'
                      strokeWidth='4'
                      strokeLinecap='round'
                    />
                  </motion.svg>
                </span>
                <br />
                Based on Interests
              </h1>
              
              <p className='text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0'>
                Connect with people who share your passions. Swipe, match, and build meaningful relationships in your city.
              </p>
              
              <div className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'>
                <Button
                  onClick={onGetStarted}
                  size='lg'
                  className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white px-8 h-14 text-lg shadow-xl shadow-orange-200 transition-all hover:shadow-2xl hover:scale-105'
                >
                  Start Swiping Free
                  <ArrowRight className='ml-2 w-5 h-5' />
                </Button>
                <Button
                  variant='outline'
                  size='lg'
                  className='border-2 border-gray-200 hover:border-[#ed8c00] hover:text-[#ed8c00] px-8 h-14 text-lg transition-all'
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>

              {/* Stats */}
              <div className='flex justify-center lg:justify-start gap-8 mt-12'>
                {[
                  { value: '10K+', label: 'Active Users' },
                  { value: '50K+', label: 'Matches Made' },
                  { value: '100+', label: 'Cities' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className='text-center'
                  >
                    <div className='text-2xl sm:text-3xl font-bold text-[#ed8c00]'>{stat.value}</div>
                    <div className='text-sm text-gray-500'>{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className='relative hidden lg:block'
            >
              <div className='relative mx-auto w-80'>
                {/* Phone mockup */}
                <div className='relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl'>
                  <div className='w-full aspect-[9/19] bg-white rounded-[2.5rem] overflow-hidden'>
                    {/* App screen */}
                    <div className='h-full bg-gradient-to-b from-orange-50 to-white p-4'>
                      {/* Profile card preview */}
                      <div className='h-full bg-white rounded-2xl shadow-lg overflow-hidden relative'>
                        <div className='h-2/3 bg-gradient-to-br from-[#ed8c00] to-[#e8763d] relative'>
                          <div className='absolute inset-0 flex items-center justify-center'>
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Heart className='w-20 h-20 text-white/30' />
                            </motion.div>
                          </div>
                          {/* Like indicator */}
                          <motion.div
                            initial={{ opacity: 0, rotate: -15 }}
                            animate={{ opacity: [0, 1, 0], rotate: -15 }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                            className='absolute top-8 left-4 border-4 border-green-400 text-green-400 px-3 py-1 rounded-lg font-bold text-lg'
                          >
                            LIKE
                          </motion.div>
                        </div>
                        <div className='p-4'>
                          <div className='h-5 w-32 bg-gray-200 rounded mb-2' />
                          <div className='h-3 w-full bg-gray-100 rounded mb-1' />
                          <div className='h-3 w-2/3 bg-gray-100 rounded' />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Notch */}
                  <div className='absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl' />
                </div>

                {/* Floating elements */}
                <motion.div
                  animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className='absolute -left-12 top-16 bg-white p-4 rounded-2xl shadow-xl'
                >
                  <Heart className='w-8 h-8 text-[#ed8c00]' fill='#ed8c00' />
                </motion.div>
                <motion.div
                  animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className='absolute -right-12 top-32 bg-white p-4 rounded-2xl shadow-xl'
                >
                  <MessageCircle className='w-8 h-8 text-[#ffbe42]' />
                </motion.div>
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  className='absolute -left-8 bottom-24 bg-white p-4 rounded-2xl shadow-xl'
                >
                  <Users className='w-8 h-8 text-[#e8763d]' />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className='absolute -right-8 bottom-40 bg-[#ed8c00] p-3 rounded-full shadow-xl'
                >
                  <Star className='w-6 h-6 text-white' fill='white' />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='py-20 px-4 sm:px-6 bg-gray-50'>
        <div className='max-w-7xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-center mb-16'
          >
            <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4'>
              Everything You Need to Connect
            </h2>
            <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
              Frinder makes it easy to find people with similar interests and build meaningful connections
            </p>
          </motion.div>

          <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className='bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100'
              >
                <div
                  className='w-14 h-14 rounded-xl flex items-center justify-center mb-4'
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className='w-7 h-7' style={{ color: feature.color }} />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>{feature.title}</h3>
                <p className='text-gray-600'>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className='py-20 px-4 sm:px-6'>
        <div className='max-w-7xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-center mb-16'
          >
            <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4'>
              How Frinder Works
            </h2>
            <p className='text-lg text-gray-600'>
              Getting started is easy – just three simple steps
            </p>
          </motion.div>

          <div className='grid md:grid-cols-3 gap-8'>
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className='text-center relative'
              >
                <div className='w-16 h-16 rounded-full bg-[#ed8c00] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200'>
                  {item.step}
                </div>
                {index < howItWorks.length - 1 && (
                  <div className='hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#ed8c00] to-[#ffbe42]' />
                )}
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>{item.title}</h3>
                <p className='text-gray-600'>{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='py-20 px-4 sm:px-6 bg-gradient-to-br from-[#ed8c00] to-[#e8763d]'>
        <div className='max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-center mb-12'
          >
            <h2 className='text-3xl sm:text-4xl font-bold text-white mb-4'>
              What People Are Saying
            </h2>
          </motion.div>

          <div className='relative h-48'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className='absolute inset-0 flex flex-col items-center justify-center text-center'
              >
                <div className='text-6xl mb-4'>{testimonials[currentTestimonial].avatar}</div>
                <p className='text-xl sm:text-2xl text-white mb-4 max-w-2xl'>
                  &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                </p>
                <p className='text-white/80 font-medium'>{testimonials[currentTestimonial].name}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className='flex justify-center gap-2 mt-8'>
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentTestimonial ? 'bg-white w-6' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 px-4 sm:px-6'>
        <div className='max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='bg-gray-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden'
          >
            {/* Background decoration */}
            <div className='absolute inset-0 opacity-10'>
              <div className='absolute top-0 left-0 w-40 h-40 bg-[#ed8c00] rounded-full blur-3xl' />
              <div className='absolute bottom-0 right-0 w-60 h-60 bg-[#ffbe42] rounded-full blur-3xl' />
            </div>
            
            <div className='relative z-10'>
              <h2 className='text-3xl sm:text-4xl font-bold text-white mb-4'>
                Ready to Find Your Match?
              </h2>
              <p className='text-lg text-gray-400 mb-8 max-w-xl mx-auto'>
                Join thousands of people already making meaningful connections on Frinder.
              </p>
              <Button
                onClick={onGetStarted}
                size='lg'
                className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white px-12 h-14 text-lg shadow-xl shadow-orange-900/30 transition-all hover:shadow-2xl hover:scale-105'
              >
                Get Started Free
                <Zap className='ml-2 w-5 h-5' />
              </Button>
              <p className='text-gray-500 text-sm mt-4'>No credit card required</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-12 px-4 sm:px-6 border-t border-gray-100'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-6'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-[#ed8c00] flex items-center justify-center'>
                <Heart className='w-4 h-4 text-white' fill='white' />
              </div>
              <span className='text-lg font-bold text-gray-900'>Frinder</span>
            </div>
            <p className='text-gray-500 text-sm'>© 2026 Frinder. All rights reserved.</p>
            <div className='flex gap-6'>
              <a href='#' className='text-gray-500 hover:text-[#ed8c00] text-sm transition-colors'>Privacy</a>
              <a href='#' className='text-gray-500 hover:text-[#ed8c00] text-sm transition-colors'>Terms</a>
              <a href='#' className='text-gray-500 hover:text-[#ed8c00] text-sm transition-colors'>Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
