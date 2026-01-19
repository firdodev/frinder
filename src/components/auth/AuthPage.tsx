'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, KeyRound, User, GraduationCap, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { isUsernameTaken } from '@/lib/firebaseServices';

type AuthStep = 'auth' | 'verify' | 'profile-info' | 'forgot-password' | 'reset-sent';

interface AuthPageProps {
  onBack?: () => void;
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const { user, userProfile, signIn, signUp, updateProfile, completeRegistration, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [university, setUniversity] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [authStep, setAuthStep] = useState<AuthStep>('auth');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check if user is logged in but hasn't completed profile (no username)
  useEffect(() => {
    if (user && userProfile) {
      setEmail(userProfile.email);
      if (!userProfile.username) {
        setAuthStep('profile-info');
      }
    }
  }, [user, userProfile]);

  // Check username availability with debounce
  const checkUsernameAvailability = (value: string) => {
    const trimmedValue = value.trim().toLowerCase();
    
    // Clear previous timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Reset state if empty
    if (!trimmedValue || trimmedValue.length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    // Validate username format (alphanumeric and underscore only)
    if (!/^[a-z0-9_]+$/.test(trimmedValue)) {
      setUsernameAvailable(false);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    
    // Debounce the check
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(trimmedValue);
        setUsernameAvailable(!taken);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const handleUsernameChange = (value: string) => {
    // Only allow lowercase letters, numbers, and underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    checkUsernameAvailability(sanitized);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send' })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Verification code sent to your email');
        setAuthStep('verify');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 4) {
      setError('Please enter the 4-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'verify', code })
      });
      const data = await response.json();
      if (data.verified) {
        await updateProfile({ isEmailVerified: true });
        setAuthStep('profile-info');
        toast.success('Email verified! Now complete your profile.');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      setAuthStep('profile-info');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate first name
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    // Validate username
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('Username can only contain lowercase letters, numbers, and underscores');
      return;
    }

    if (usernameAvailable === false) {
      setError('Username is already taken');
      return;
    }

    setLoading(true);
    try {
      // Final check for username availability
      const taken = await isUsernameTaken(username);
      if (taken) {
        setError('Username is already taken');
        setUsernameAvailable(false);
        setLoading(false);
        return;
      }
      
      await completeRegistration(firstName.trim(), username.trim(), university || undefined);
      toast.success('Profile info saved! Now let\'s complete your profile.');
      // The page will automatically redirect to ProfileSetup since username is now set
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setAuthStep('reset-sent');
      toast.success('Password reset email sent!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (authStep === 'verify') {
    return (
      <div className='min-h-dvh bg-[#fff7ed] flex flex-col items-center justify-center p-4 pt-safe mobile-fullscreen'>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md'>
          <Card className='shadow-xl border-0'>
            <CardHeader className='text-center'>
              <button
                onClick={() => setAuthStep('auth')}
                className='absolute left-4 top-4 p-2 hover:bg-muted rounded-full'
              >
                <ArrowLeft className='w-5 h-5' />
              </button>
              <div className='w-16 h-16 rounded-full bg-[#ed8c00] flex items-center justify-center mx-auto mb-4'>
                <Mail className='w-8 h-8 text-white' />
              </div>
              <CardTitle className='text-2xl'>Verify Your Email</CardTitle>
              <CardDescription>
                We sent a 4-digit code to <br />
                <span className='font-semibold text-[#ed8c00]'>{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex justify-center gap-3'>
                {verificationCode.map((digit, index) => (
                  <Input
                    key={`digit-${index}`}
                    ref={el => {
                      inputRefs.current[index] = el;
                    }}
                    type='text'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className='w-14 h-14 text-center text-2xl font-bold border-2 focus:border-[#ed8c00]'
                  />
                ))}
              </div>

              {error && <p className='text-sm text-destructive text-center'>{error}</p>}

              <Button
                onClick={verifyCode}
                className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12'
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <p className='text-center text-sm text-muted-foreground'>
                Didn&apos;t receive the code?{' '}
                <button
                  onClick={sendVerificationCode}
                  className='text-[#ed8c00] font-semibold hover:underline'
                  disabled={loading}
                >
                  Resend
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (authStep === 'profile-info') {
    return (
      <div className='min-h-dvh bg-[#fff7ed] flex flex-col items-center justify-center p-4 pt-safe mobile-fullscreen'>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md'>
          <Card className='shadow-xl border-0'>
            <CardHeader className='text-center'>
              <div className='w-16 h-16 rounded-full bg-[#ed8c00] flex items-center justify-center mx-auto mb-4'>
                <User className='w-8 h-8 text-white' />
              </div>
              <CardTitle className='text-2xl'>Complete Your Profile</CardTitle>
              <CardDescription>
                Just a few more details to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompleteProfile} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='profile-firstName'>First Name</Label>
                  <div className='relative'>
                    <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <Input
                      id='profile-firstName'
                      type='text'
                      placeholder='Your first name'
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className='pl-10'
                      required
                      maxLength={30}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='profile-username'>Username</Label>
                  <div className='relative'>
                    <AtSign className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <Input
                      id='profile-username'
                      type='text'
                      placeholder='username (letters, numbers, _)'
                      value={username}
                      onChange={e => handleUsernameChange(e.target.value)}
                      className={`pl-10 pr-10 ${
                        username.length >= 3
                          ? usernameAvailable === true
                            ? 'border-green-500 focus:ring-green-500'
                            : usernameAvailable === false
                            ? 'border-red-500 focus:ring-red-500'
                            : ''
                          : ''
                      }`}
                      required
                      maxLength={20}
                    />
                    {username.length >= 3 && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        {checkingUsername ? (
                          <div className='w-4 h-4 border-2 border-[#ed8c00] border-t-transparent rounded-full animate-spin' />
                        ) : usernameAvailable === true ? (
                          <CheckCircle className='w-4 h-4 text-green-500' />
                        ) : usernameAvailable === false ? (
                          <span className='text-red-500 text-xs'>Taken</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {username && username.length < 3 && (
                    <p className='text-xs text-muted-foreground'>Username must be at least 3 characters</p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='profile-university'>University (Optional)</Label>
                  <div className='relative'>
                    <GraduationCap className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <select
                      id='profile-university'
                      value={university}
                      onChange={e => setUniversity(e.target.value)}
                      className='flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    >
                      <option value=''>Select university...</option>
                      <option value='Universiteti Polis'>Universiteti Polis</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='text-sm text-destructive text-center'
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type='submit'
                  className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12'
                  disabled={loading || checkingUsername}
                >
                  {loading ? 'Completing...' : 'Complete Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (authStep === 'forgot-password') {
    return (
      <div className='min-h-dvh bg-[#fff7ed] flex flex-col items-center justify-center p-4 pt-safe mobile-fullscreen'>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md'>
          <Card className='shadow-xl border-0'>
            <CardHeader className='text-center relative'>
              <button
                onClick={() => {
                  setAuthStep('auth');
                  setError('');
                }}
                className='absolute left-4 top-4 p-2 hover:bg-muted rounded-full'
              >
                <ArrowLeft className='w-5 h-5' />
              </button>
              <div className='w-16 h-16 rounded-full bg-[#ed8c00] flex items-center justify-center mx-auto mb-4'>
                <KeyRound className='w-8 h-8 text-white' />
              </div>
              <CardTitle className='text-2xl'>Forgot Password?</CardTitle>
              <CardDescription>
                No worries! Enter your email and we&apos;ll send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='reset-email'>Email</Label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <Input
                      id='reset-email'
                      type='email'
                      placeholder='yourname@universitetipolis.edu.al'
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className='pl-10'
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='text-sm text-destructive text-center'
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type='submit'
                  className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12'
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <p className='text-center text-sm text-muted-foreground'>
                  Remember your password?{' '}
                  <button
                    type='button'
                    onClick={() => {
                      setAuthStep('auth');
                      setError('');
                    }}
                    className='text-[#ed8c00] font-semibold hover:underline'
                  >
                    Sign In
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (authStep === 'reset-sent') {
    return (
      <div className='min-h-dvh bg-[#fff7ed] flex flex-col items-center justify-center p-4 pt-safe mobile-fullscreen'>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className='text-center max-w-md'
        >
          <div className='w-24 h-24 rounded-full bg-[#ed8c00] flex items-center justify-center mx-auto mb-6'>
            <Mail className='w-12 h-12 text-white' />
          </div>
          <h1 className='text-3xl font-bold text-[#1a1a1a] mb-2'>Check Your Email</h1>
          <p className='text-[#666] mb-6'>
            We&apos;ve sent a password reset link to<br />
            <span className='font-semibold text-[#ed8c00]'>{email}</span>
          </p>
          <p className='text-sm text-[#999] mb-6'>
            Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
          </p>
          <Button
            onClick={() => {
              setAuthStep('auth');
              setError('');
              setEmail('');
            }}
            className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12 px-8'
          >
            Back to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='min-h-dvh bg-[#fff7ed] flex flex-col items-center justify-center p-4 pt-safe mobile-fullscreen'>
      {/* Back button */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onBack}
          className='absolute top-6 left-6 p-2 hover:bg-white/50 rounded-full transition-colors'
        >
          <ArrowLeft className='w-6 h-6 text-[#1a1a1a]' />
        </motion.button>
      )}

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className='text-center mb-8'>
        <Image 
          src='/frinder-logo.png' 
          alt='Frinder' 
          width={72} 
          height={72} 
          className='rounded-2xl mx-auto mb-4 shadow-lg'
          priority
        />
        <h1 className='text-4xl font-bold text-[#ed8c00] mb-2'>Frinder</h1>
        <p className='text-[#666]'>Find your match at university</p>
      </motion.div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className='w-full max-w-md'
      >
        <Card className='shadow-xl border-0'>
          <CardHeader className='text-center pb-2'>
            <CardTitle className='text-2xl font-bold text-[#1a1a1a]'>Welcome</CardTitle>
            <CardDescription>
              Use your <span className='font-semibold text-[#ed8c00]'>@universitetipolis.edu.al</span> email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
              <TabsList className='grid w-full grid-cols-2 mb-6 bg-[#fef3e2]'>
                <TabsTrigger value='signin' className='data-[state=active]:bg-[#ed8c00] data-[state=active]:text-white'>
                  Sign In
                </TabsTrigger>
                <TabsTrigger value='signup' className='data-[state=active]:bg-[#ed8c00] data-[state=active]:text-white'>
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode='wait'>
                <TabsContent value='signin' className='mt-0'>
                  <motion.form
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSignIn}
                    className='space-y-4'
                  >
                    <div className='space-y-2'>
                      <Label htmlFor='email'>Email</Label>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          id='email'
                          type='email'
                          placeholder='yourname@universitetipolis.edu.al'
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className='pl-10'
                          required
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='password'>Password</Label>
                        <button
                          type='button'
                          onClick={() => {
                            setError('');
                            setAuthStep('forgot-password');
                          }}
                          className='text-xs text-[#ed8c00] hover:underline'
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className='relative'>
                        <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          id='password'
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className='pl-10 pr-10'
                          required
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                        >
                          {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='text-sm text-destructive text-center'
                      >
                        {error}
                      </motion.p>
                    )}

                    <Button
                      type='submit'
                      className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12'
                      disabled={loading}
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value='signup' className='mt-0'>
                  <motion.form
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSignUp}
                    className='space-y-4'
                  >
                    <div className='space-y-2'>
                      <Label htmlFor='signup-email'>Email</Label>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          id='signup-email'
                          type='email'
                          placeholder='yourname@universitetipolis.edu.al'
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className='pl-10'
                          required
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='signup-password'>Password</Label>
                      <div className='relative'>
                        <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          id='signup-password'
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className='pl-10 pr-10'
                          required
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                        >
                          {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='confirm-password'>Confirm Password</Label>
                      <div className='relative'>
                        <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                          id='confirm-password'
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className='pl-10'
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='text-sm text-destructive text-center'
                      >
                        {error}
                      </motion.p>
                    )}

                    <Button
                      type='submit'
                      className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12'
                      disabled={loading}
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <p className='text-[#999] text-sm mt-8'>© 2026 Frinder. All rights reserved.</p>
    </div>
  );
}
