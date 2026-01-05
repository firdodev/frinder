'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ChevronRight, ChevronLeft, Plus, X, Sparkles, User, Heart, Users, MapPin, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadProfilePhoto, compressImage } from '@/lib/storageService';
import { isDisplayNameTaken } from '@/lib/firebaseServices';
import { toast } from 'sonner';

const INTERESTS = [
  'Music',
  'Sports',
  'Travel',
  'Gaming',
  'Movies',
  'Reading',
  'Art',
  'Photography',
  'Cooking',
  'Fitness',
  'Technology',
  'Fashion',
  'Dancing',
  'Hiking',
  'Coffee',
  'Wine',
  'Dogs',
  'Cats',
  'Beach',
  'Mountains',
  'Nightlife',
  'Food',
  'Netflix',
  'Anime'
];

const COUNTRIES = [
  'Albania',
  'Kosovo',
  'North Macedonia',
  'Montenegro',
  'Serbia',
  'Greece',
  'Italy',
  'Germany',
  'United Kingdom',
  'United States',
  'France',
  'Spain',
  'Switzerland',
  'Austria',
  'Netherlands'
];

const CITIES: Record<string, string[]> = {
  Albania: ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Elbasan', 'Korçë', 'Fier', 'Berat'],
  Kosovo: ['Pristina', 'Prizren', 'Ferizaj', 'Peja', 'Gjakova', 'Mitrovica'],
  'North Macedonia': ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Ohrid'],
  Montenegro: ['Podgorica', 'Nikšić', 'Herceg Novi', 'Bar', 'Budva', 'Kotor'],
  Serbia: ['Belgrade', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica'],
  Greece: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa'],
  Italy: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Venice'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
  France: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'],
  Switzerland: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'],
  Austria: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven']
};

export default function ProfileSetup() {
  const { user, userProfile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkingDisplayName, setCheckingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameValid, setDisplayNameValid] = useState(false);
  const displayNameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    age: userProfile?.age || 18,
    gender: userProfile?.gender || ('other' as 'male' | 'female' | 'other'),
    country: userProfile?.country || '',
    city: userProfile?.city || '',
    interests: userProfile?.interests || [],
    lookingFor: userProfile?.lookingFor || ('both' as 'people' | 'groups' | 'both'),
    photos: userProfile?.photos || ([] as string[])
  });

  const totalSteps = 5;

  // Check display name availability with debounce
  const checkDisplayName = async (name: string) => {
    if (displayNameCheckTimeout.current) {
      clearTimeout(displayNameCheckTimeout.current);
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      setDisplayNameError(null);
      setDisplayNameValid(false);
      setCheckingDisplayName(false);
      return;
    }

    setCheckingDisplayName(true);
    setDisplayNameError(null);
    setDisplayNameValid(false);

    displayNameCheckTimeout.current = setTimeout(async () => {
      try {
        const isTaken = await isDisplayNameTaken(trimmedName, user?.uid);
        if (isTaken) {
          setDisplayNameError('This display name is already taken');
          setDisplayNameValid(false);
        } else {
          setDisplayNameError(null);
          setDisplayNameValid(true);
        }
      } catch (error) {
        console.error('Error checking display name:', error);
      } finally {
        setCheckingDisplayName(false);
      }
    }, 500); // 500ms debounce
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, displayName: value }));
    checkDisplayName(value);
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 10
        ? [...prev.interests, interest]
        : prev.interests
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Compress the image
      const compressedFile = await compressImage(file, 1024, 0.8);

      // Upload to Firebase Storage
      const photoUrl = await uploadProfilePhoto(user.uid, compressedFile, formData.photos.length);

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, photoUrl]
      }));

      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateProfile({
        ...formData,
        isProfileComplete: true
      });
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.displayName.trim().length >= 2 && formData.age >= 18 && formData.gender !== 'other' && !displayNameError && displayNameValid && !checkingDisplayName;
      case 2:
        return formData.country && formData.city;
      case 3:
        return formData.bio.trim().length >= 10;
      case 4:
        return formData.interests.length >= 3;
      case 5:
        return formData.photos.length >= 1;
      default:
        return false;
    }
  };

  return (
    <div className='min-h-screen bg-[#fff7ed] flex flex-col'>
      {/* Hidden file input */}
      <input ref={fileInputRef} type='file' accept='image/*' onChange={handlePhotoUpload} className='hidden' />

      {/* Progress bar */}
      <div className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm'>
        <div className='h-1 bg-muted'>
          <motion.div
            className='h-full bg-[#ed8c00]'
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className='px-4 py-3 flex items-center justify-between'>
          <button
            onClick={handleBack}
            disabled={step === 1}
            className='p-2 rounded-full hover:bg-muted disabled:opacity-0 transition-all'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <span className='text-sm font-medium text-muted-foreground'>
            Step {step} of {totalSteps}
          </span>
          <div className='w-9' />
        </div>
      </div>

      <div className='flex-1 pt-20 pb-24 px-4 overflow-y-auto'>
        <AnimatePresence mode='wait'>
          {/* Step 1: Name, Age, Gender */}
          {step === 1 && (
            <motion.div
              key='step1'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='max-w-md mx-auto'
            >
              <div className='text-center mb-8'>
                <div className='w-16 h-16 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mx-auto mb-4'>
                  <User className='w-8 h-8 text-[#ed8c00]' />
                </div>
                <h1 className='text-2xl font-bold text-foreground'>Let&apos;s get started</h1>
                <p className='text-muted-foreground mt-2'>Tell us a bit about yourself</p>
              </div>

              <Card className='border-0 shadow-lg'>
                <CardContent className='pt-6 space-y-6'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Display Name</Label>
                    <div className='relative'>
                      <Input
                        id='name'
                        placeholder='Your name'
                        value={formData.displayName}
                        onChange={e => handleDisplayNameChange(e.target.value)}
                        className={`text-lg h-12 pr-10 ${
                          displayNameError ? 'border-red-500 focus-visible:ring-red-500' : 
                          displayNameValid ? 'border-green-500 focus-visible:ring-green-500' : ''
                        }`}
                      />
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        {checkingDisplayName && (
                          <Loader2 className='w-5 h-5 text-muted-foreground animate-spin' />
                        )}
                        {!checkingDisplayName && displayNameError && (
                          <AlertCircle className='w-5 h-5 text-red-500' />
                        )}
                        {!checkingDisplayName && displayNameValid && (
                          <CheckCircle className='w-5 h-5 text-green-500' />
                        )}
                      </div>
                    </div>
                    {displayNameError && (
                      <p className='text-sm text-red-500 flex items-center gap-1'>
                        <AlertCircle className='w-3 h-3' />
                        {displayNameError}
                      </p>
                    )}
                    {displayNameValid && !checkingDisplayName && (
                      <p className='text-sm text-green-500 flex items-center gap-1'>
                        <CheckCircle className='w-3 h-3' />
                        This display name is available
                      </p>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='age'>Age</Label>
                      <Input
                        id='age'
                        type='number'
                        min={18}
                        max={99}
                        value={formData.age}
                        onChange={e => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 18 }))}
                        className='text-lg h-12'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value: 'male' | 'female' | 'other') =>
                          setFormData(prev => ({ ...prev, gender: value }))
                        }
                      >
                        <SelectTrigger className='h-12'>
                          <SelectValue placeholder='Select' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='male'>Male</SelectItem>
                          <SelectItem value='female'>Female</SelectItem>
                          <SelectItem value='other'>Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className='text-xs text-muted-foreground'>Must be 18 or older to use Frinder</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <motion.div
              key='step2'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='max-w-md mx-auto'
            >
              <div className='text-center mb-8'>
                <div className='w-16 h-16 rounded-full bg-[#ffbe42]/10 flex items-center justify-center mx-auto mb-4'>
                  <MapPin className='w-8 h-8 text-[#ffbe42]' />
                </div>
                <h1 className='text-2xl font-bold text-foreground'>Where are you located?</h1>
                <p className='text-muted-foreground mt-2'>This helps us find people near you</p>
              </div>

              <Card className='border-0 shadow-lg'>
                <CardContent className='pt-6 space-y-6'>
                  <div className='space-y-2'>
                    <Label>Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={value => setFormData(prev => ({ ...prev, country: value, city: '' }))}
                    >
                      <SelectTrigger className='h-12'>
                        <SelectValue placeholder='Select your country' />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label>City</Label>
                    <Select
                      value={formData.city}
                      onValueChange={value => setFormData(prev => ({ ...prev, city: value }))}
                      disabled={!formData.country}
                    >
                      <SelectTrigger className='h-12'>
                        <SelectValue placeholder={formData.country ? 'Select your city' : 'Select country first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.country &&
                          CITIES[formData.country]?.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Bio & Looking For */}
          {step === 3 && (
            <motion.div
              key='step3'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='max-w-md mx-auto'
            >
              <div className='text-center mb-8'>
                <div className='w-16 h-16 rounded-full bg-[#e8763d]/10 flex items-center justify-center mx-auto mb-4'>
                  <Sparkles className='w-8 h-8 text-[#e8763d]' />
                </div>
                <h1 className='text-2xl font-bold text-foreground'>Tell us about yourself</h1>
                <p className='text-muted-foreground mt-2'>Help others get to know you</p>
              </div>

              <Card className='border-0 shadow-lg'>
                <CardContent className='pt-6 space-y-6'>
                  <div className='space-y-2'>
                    <Label htmlFor='bio'>Bio</Label>
                    <Textarea
                      id='bio'
                      placeholder="I'm passionate about..."
                      value={formData.bio}
                      onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      className='min-h-[120px] resize-none text-base'
                      maxLength={500}
                    />
                    <p className='text-xs text-muted-foreground text-right'>{formData.bio.length}/500</p>
                  </div>

                  <div className='space-y-3'>
                    <Label>What are you looking for?</Label>
                    <div className='grid grid-cols-3 gap-2'>
                      {[
                        { value: 'people', label: 'People', icon: Heart },
                        { value: 'groups', label: 'Groups', icon: Users },
                        { value: 'both', label: 'Both', icon: Sparkles }
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() =>
                            setFormData(prev => ({ ...prev, lookingFor: value as 'people' | 'groups' | 'both' }))
                          }
                          className={`p-4 rounded-xl border-2 transition-all ${
                            formData.lookingFor === value
                              ? 'border-[#ed8c00] bg-[#ed8c00]/10'
                              : 'border-muted hover:border-[#ed8c00]/50'
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 mx-auto mb-2 ${
                              formData.lookingFor === value ? 'text-[#ed8c00]' : 'text-muted-foreground'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              formData.lookingFor === value ? 'text-[#ed8c00]' : 'text-muted-foreground'
                            }`}
                          >
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <motion.div
              key='step4'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='max-w-md mx-auto'
            >
              <div className='text-center mb-8'>
                <div className='w-16 h-16 rounded-full bg-[#cc5d00]/10 flex items-center justify-center mx-auto mb-4'>
                  <Heart className='w-8 h-8 text-[#cc5d00]' />
                </div>
                <h1 className='text-2xl font-bold text-foreground'>Your interests</h1>
                <p className='text-muted-foreground mt-2'>Select at least 3 interests</p>
              </div>

              <Card className='border-0 shadow-lg'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center justify-between'>
                    <span>Pick your favorites</span>
                    <Badge variant='secondary'>{formData.interests.length}/10</Badge>
                  </CardTitle>
                  <CardDescription>This helps us find better matches for you</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-wrap gap-2'>
                    {INTERESTS.map((interest, index) => (
                      <motion.button
                        key={`${interest}-${index}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleInterestToggle(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.interests.includes(interest)
                            ? 'bg-[#ed8c00] text-white shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {interest}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Photos */}
          {step === 5 && (
            <motion.div
              key='step5'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='max-w-md mx-auto'
            >
              <div className='text-center mb-8'>
                <div className='w-16 h-16 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mx-auto mb-4'>
                  <Camera className='w-8 h-8 text-[#ed8c00]' />
                </div>
                <h1 className='text-2xl font-bold text-foreground'>Add your photos</h1>
                <p className='text-muted-foreground mt-2'>Add at least 1 photo to get started</p>
              </div>

              <Card className='border-0 shadow-lg'>
                <CardContent className='pt-6'>
                  <div className='grid grid-cols-3 gap-3'>
                    {[...Array(6)].map((_, index) => (
                      <motion.div key={index} whileHover={{ scale: 1.02 }} className='aspect-[3/4] relative'>
                        {formData.photos[index] ? (
                          <div className='relative w-full h-full rounded-xl overflow-hidden'>
                            <img
                              src={formData.photos[index]}
                              alt={`Photo ${index + 1}`}
                              className='w-full h-full object-cover'
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className='absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors'
                            >
                              <X className='w-4 h-4' />
                            </button>
                            {index === 0 && (
                              <span className='absolute bottom-2 left-2 text-xs bg-[#ed8c00] text-white px-2 py-1 rounded-full'>
                                Main
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className='w-full h-full rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center hover:border-[#ed8c00] hover:bg-[#ed8c00]/5 transition-all disabled:opacity-50'
                          >
                            {uploadingPhoto ? (
                              <Loader2 className='w-8 h-8 text-[#ed8c00] animate-spin' />
                            ) : (
                              <Plus className='w-8 h-8 text-muted-foreground' />
                            )}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <p className='text-xs text-muted-foreground text-center mt-4'>
                    Tip: Photos with clear face photos get more matches!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div className='fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t safe-bottom'>
        <div className='max-w-md mx-auto'>
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12 text-lg font-semibold'
            >
              Continue
              <ChevronRight className='w-5 h-5 ml-2' />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
              className='w-full bg-[#ed8c00] hover:bg-[#cc5d00] text-white h-12 text-lg font-semibold'
            >
              {loading ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <>
                  Start Swiping
                  <Sparkles className='w-5 h-5 ml-2' />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
