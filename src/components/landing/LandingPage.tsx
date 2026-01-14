'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Heart, Users, MessageCircle, Sparkles, ArrowRight, Star, Zap, Shield, ChevronDown, Play, Crown } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const features = [
    {
      icon: Heart,
      title: 'Smart Matching',
      description: 'AI-powered algorithm finds people who truly match your vibe',
      color: 'bg-frinder-orange'
    },
    {
      icon: Users,
      title: 'Group Activities',
      description: 'Join communities and make friends with shared interests',
      color: 'bg-frinder-gold'
    },
    {
      icon: MessageCircle,
      title: 'Real Conversations',
      description: 'Break the ice with prompts and have meaningful chats',
      color: 'bg-frinder-amber'
    },
    {
      icon: Shield,
      title: 'Safe & Verified',
      description: 'Email verification ensures a trusted community',
      color: 'bg-frinder-coral'
    }
  ];

  const testimonials = [
    {
      name: 'Sara M.',
      role: 'University Student',
      text: "Found my study group and best friends through Frinder. Life-changing!",
      image: '👩‍🎓',
      rating: 5
    },
    {
      name: 'Andi K.',
      role: 'Software Developer',
      text: 'The matching algorithm actually works. Met someone amazing!',
      image: '👨‍💻',
      rating: 5
    },
    {
      name: 'Elena B.',
      role: 'Artist & Creator',
      text: 'Finally an app that helps you make real connections.',
      image: '👩‍🎨',
      rating: 5
    }
  ];

  const stats = [
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '100K+', label: 'Matches Made', icon: Heart },
    { value: '4.9', label: 'App Rating', icon: Star }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setIsScrolled(target.scrollTop > 50);
    };
    const container = document.getElementById('landing-scroll-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='fixed inset-0 bg-black text-white'>
      {/* Fixed Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/95 backdrop-blur-sm border-b border-frinder-orange/20' : 'bg-transparent'
        }`}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between'>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className='flex items-center gap-3'
            >
              <img
                src='/frinder-logo.png'
                alt='Frinder'
                className='w-10 h-10 rounded-xl'
              />
              <span className='text-2xl font-bold text-frinder-orange'>
                Frinder
              </span>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Button
                onClick={onGetStarted}
                className='bg-frinder-orange hover:bg-frinder-burnt text-white font-semibold px-6 rounded-full transition-all hover:scale-105'
              >
                Get Started
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Scrollable Content Container */}
      <div id='landing-scroll-container' className='h-full overflow-y-auto overflow-x-hidden'>
        {/* Hero Section */}
        <section className='relative min-h-screen flex items-center pt-20 pb-10 px-4 sm:px-6'>
          <div className='max-w-7xl mx-auto w-full'>
            <div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
              {/* Hero Text */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className='text-center lg:text-left'
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className='inline-flex items-center gap-2 bg-frinder-orange/10 border border-frinder-orange/30 text-frinder-orange px-4 py-2 rounded-full text-sm font-medium mb-8'
                >
                  <Sparkles className='w-4 h-4' />
                  <span>#1 App for Making Real Connections</span>
                </motion.div>

                <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6'>
                  <span className='text-white'>Find Your</span>
                  <br />
                  <span className='text-frinder-gold'>
                    Perfect Match
                  </span>
                </h1>

                <p className='text-lg sm:text-xl text-white/70 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed'>
                  Connect with people who share your passions. Swipe, match, and build meaningful relationships.
                </p>

                <div className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12'>
                  <Button
                    onClick={onGetStarted}
                    size='lg'
                    className='bg-frinder-orange hover:bg-frinder-burnt text-white px-8 h-14 text-lg font-semibold rounded-full transition-all hover:scale-105 group'
                  >
                    Start Free
                    <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
                  </Button>
                  <Button
                    variant='outline'
                    size='lg'
                    className='border-2 border-frinder-orange/40 hover:border-frinder-orange bg-transparent hover:bg-frinder-orange/10 text-white px-8 h-14 text-lg font-semibold rounded-full transition-all'
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Play className='mr-2 w-5 h-5' />
                    See How It Works
                  </Button>
                </div>

                {/* Stats Row */}
                <div className='grid grid-cols-3 gap-6'>
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className='text-center lg:text-left'
                    >
                      <div className='flex items-center justify-center lg:justify-start gap-2 mb-1'>
                        <stat.icon className='w-4 h-4 text-frinder-orange' />
                        <span className='text-2xl sm:text-3xl font-bold text-white'>{stat.value}</span>
                      </div>
                      <span className='text-sm text-white/50'>{stat.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Hero Visual - Phone Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className='relative hidden lg:flex justify-center'
              >
                <div className='relative'>
                  {/* Phone */}
                  <div className='relative bg-black rounded-[3rem] p-3 shadow-2xl shadow-frinder-orange/20 border border-frinder-orange/30'>
                    <div className='w-72 aspect-[9/19] bg-black rounded-[2.5rem] overflow-hidden relative border border-white/10'>
                      {/* Screen content */}
                      <div className='absolute inset-0 bg-black p-4 flex flex-col'>
                        {/* Status bar */}
                        <div className='flex justify-between items-center text-xs text-white/60 mb-4'>
                          <span>9:41</span>
                          <div className='flex gap-1'>
                            <div className='w-4 h-2 bg-white/60 rounded-sm' />
                          </div>
                        </div>
                        
                        {/* Profile Card */}
                        <div className='flex-1 bg-black rounded-3xl overflow-hidden shadow-xl relative border border-frinder-orange/20'>
                          <div className='h-3/5 bg-frinder-orange relative'>
                            <motion.div
                              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className='absolute inset-0 flex items-center justify-center'
                            >
                              <Heart className='w-24 h-24 text-white/20' />
                            </motion.div>
                            
                            {/* Like stamp */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0, rotate: -20 }}
                              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5], rotate: -20 }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                              className='absolute top-8 left-4 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl font-bold text-xl bg-green-400/20'
                            >
                              LIKE
                            </motion.div>
                          </div>
                          <div className='p-4 bg-black'>
                            <div className='flex items-center gap-2 mb-2'>
                              <div className='h-5 w-28 bg-white/20 rounded-lg' />
                              <div className='h-5 w-8 bg-frinder-orange/30 rounded-lg' />
                            </div>
                            <div className='h-3 w-full bg-white/10 rounded-lg mb-2' />
                            <div className='h-3 w-2/3 bg-white/10 rounded-lg' />
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className='flex justify-center gap-4 mt-4'>
                          <div className='w-14 h-14 rounded-full bg-white/5 border border-white/20 flex items-center justify-center'>
                            <span className='text-red-400 text-2xl'>✕</span>
                          </div>
                          <div className='w-16 h-16 rounded-full bg-frinder-orange flex items-center justify-center shadow-lg shadow-frinder-orange/30'>
                            <Heart className='w-8 h-8 text-white' fill='white' />
                          </div>
                          <div className='w-14 h-14 rounded-full bg-white/5 border border-white/20 flex items-center justify-center'>
                            <Star className='w-6 h-6 text-blue-400' />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Notch */}
                    <div className='absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full border-b border-white/10' />
                  </div>

                  {/* Floating Cards */}
                  <motion.div
                    animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className='absolute -left-16 top-20 bg-black p-4 rounded-2xl border border-frinder-orange/30 shadow-xl'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-full bg-frinder-orange flex items-center justify-center'>
                        <Heart className='w-5 h-5 text-white' fill='white' />
                      </div>
                      <div>
                        <div className='text-sm font-semibold text-white'>New Match!</div>
                        <div className='text-xs text-white/50'>Say hello 👋</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [10, -10, 10], rotate: [3, -3, 3] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                    className='absolute -right-12 top-40 bg-black p-4 rounded-2xl border border-frinder-gold/30 shadow-xl'
                  >
                    <div className='flex items-center gap-2'>
                      <MessageCircle className='w-6 h-6 text-frinder-gold' />
                      <span className='text-sm font-medium text-white'>12 messages</span>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className='absolute -right-8 bottom-32 w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/30'
                  >
                    <Star className='w-7 h-7 text-white' fill='white' />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50'
          >
            <span className='text-sm'>Scroll to explore</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ChevronDown className='w-6 h-6' />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id='features' className='py-24 px-4 sm:px-6 relative bg-black'>
          <div className='max-w-7xl mx-auto'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className='text-center mb-16'
            >
              <span className='text-frinder-orange font-semibold text-sm uppercase tracking-wider mb-4 block'>Features</span>
              <h2 className='text-4xl sm:text-5xl font-bold text-white mb-6'>
                Everything You Need to
                <br />
                <span className='text-frinder-gold'>
                  Connect & Thrive
                </span>
              </h2>
              <p className='text-lg text-white/60 max-w-2xl mx-auto'>
                Powerful features designed to help you find your perfect match and build lasting relationships
              </p>
            </motion.div>

            <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className='group relative bg-black border border-frinder-orange/20 p-6 rounded-3xl hover:border-frinder-orange/50 transition-all duration-300'
                >
                  <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className='w-7 h-7 text-white' />
                  </div>
                  <h3 className='text-xl font-semibold text-white mb-3'>{feature.title}</h3>
                  <p className='text-white/60 leading-relaxed'>{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className='py-24 px-4 sm:px-6 bg-frinder-orange/5'>
          <div className='max-w-7xl mx-auto'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className='text-center mb-16'
            >
              <span className='text-frinder-orange font-semibold text-sm uppercase tracking-wider mb-4 block'>How It Works</span>
              <h2 className='text-4xl sm:text-5xl font-bold text-white mb-6'>
                Three Steps to Your
                <br />
                <span className='text-frinder-gold'>
                  Next Connection
                </span>
              </h2>
            </motion.div>

            <div className='grid md:grid-cols-3 gap-8 lg:gap-12'>
              {[
                { step: '01', title: 'Create Profile', desc: 'Sign up and showcase your personality with photos and interests', icon: '✨' },
                { step: '02', title: 'Get Matched', desc: 'Our AI finds compatible people based on your preferences', icon: '💫' },
                { step: '03', title: 'Connect', desc: 'Start chatting, plan meetups, and build real relationships', icon: '🎯' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className='relative text-center'
                >
                  <div className='text-6xl mb-6'>{item.icon}</div>
                  <div className='text-frinder-orange/20 text-7xl font-bold absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 select-none'>
                    {item.step}
                  </div>
                  <h3 className='text-2xl font-semibold text-white mb-3 relative z-10'>{item.title}</h3>
                  <p className='text-white/60 max-w-xs mx-auto'>{item.desc}</p>
                  
                  {index < 2 && (
                    <div className='hidden md:block absolute top-12 right-0 translate-x-1/2 w-24 h-px bg-frinder-orange/30' />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className='py-24 px-4 sm:px-6 bg-black'>
          <div className='max-w-4xl mx-auto'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className='text-center mb-12'
            >
              <span className='text-frinder-orange font-semibold text-sm uppercase tracking-wider mb-4 block'>Testimonials</span>
              <h2 className='text-4xl sm:text-5xl font-bold text-white'>
                Loved by <span className='text-frinder-gold'>Thousands</span>
              </h2>
            </motion.div>

            <div className='relative bg-black border border-frinder-orange/20 rounded-3xl p-8 sm:p-12'>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={currentTestimonial}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className='text-center'
                >
                  <div className='text-6xl mb-6'>{testimonials[currentTestimonial].image}</div>
                  <div className='flex justify-center gap-1 mb-6'>
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className='w-5 h-5 text-frinder-gold' fill='currentColor' />
                    ))}
                  </div>
                  <p className='text-xl sm:text-2xl text-white mb-6 leading-relaxed'>
                    &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                  </p>
                  <div>
                    <p className='text-white font-semibold'>{testimonials[currentTestimonial].name}</p>
                    <p className='text-white/50 text-sm'>{testimonials[currentTestimonial].role}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className='flex justify-center gap-2 mt-8'>
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentTestimonial ? 'bg-frinder-orange w-8' : 'bg-white/20 w-2 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Premium CTA */}
        <section className='py-24 px-4 sm:px-6 bg-black'>
          <div className='max-w-5xl mx-auto'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className='relative overflow-hidden rounded-[2.5rem] border-2 border-frinder-orange'
            >
              <div className='relative bg-black rounded-[2.3rem] p-8 sm:p-12 lg:p-16'>
                <div className='relative z-10 text-center'>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    className='inline-flex items-center gap-2 bg-frinder-orange/10 border border-frinder-orange/30 px-4 py-2 rounded-full mb-8'
                  >
                    <Crown className='w-5 h-5 text-frinder-gold' />
                    <span className='text-white font-medium'>Start Your Journey Today</span>
                  </motion.div>

                  <h2 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6'>
                    Ready to Find Your
                    <br />
                    <span className='text-frinder-gold'>
                      Perfect Match?
                    </span>
                  </h2>

                  <p className='text-lg sm:text-xl text-white/70 mb-10 max-w-2xl mx-auto'>
                    Join thousands of people already making meaningful connections. It&apos;s free to get started.
                  </p>

                  <Button
                    onClick={onGetStarted}
                    size='lg'
                    className='bg-frinder-orange hover:bg-frinder-burnt text-white px-12 h-16 text-xl font-semibold rounded-full transition-all hover:scale-105 group'
                  >
                    Get Started Free
                    <Zap className='ml-2 w-6 h-6 group-hover:rotate-12 transition-transform' />
                  </Button>

                  <p className='text-white/40 text-sm mt-6'>No credit card required • Free forever</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className='py-12 px-4 sm:px-6 border-t border-frinder-orange/20 bg-black'>
          <div className='max-w-7xl mx-auto'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-6'>
              <div className='flex items-center gap-3'>
                <img src='/frinder-logo.png' alt='Frinder' className='w-8 h-8 rounded-lg' />
                <span className='text-lg font-bold text-frinder-orange'>
                  Frinder
                </span>
              </div>
              <p className='text-white/40 text-sm'>© 2026 Frinder. All rights reserved.</p>
              <div className='flex gap-6'>
                <a href='#' className='text-white/40 hover:text-frinder-orange text-sm transition-colors'>Privacy</a>
                <a href='#' className='text-white/40 hover:text-frinder-orange text-sm transition-colors'>Terms</a>
                <a href='#' className='text-white/40 hover:text-frinder-orange text-sm transition-colors'>Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
