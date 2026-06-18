import { useState } from 'react';
import { Trophy, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';
import axios from 'axios';

const BACKEND_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
const API_BASE = `${BACKEND_URL}/api/auth`;

interface ForgotPasswordProps {
  onNavigate: (path: string) => void;
}

type ResetStep = 'ENTER_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD';

export function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const [step, setStep] = useState<ResetStep>('ENTER_EMAIL');
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/forgot-password`, { email });
      setStep('VERIFY_OTP');
      toast.success('Verification code sent to your email!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error('Please enter a valid verification code');
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/verify-reset-otp`, { email, otp });
      setStep('NEW_PASSWORD');
      toast.success('Code verified successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/reset-password`, { email, newPassword });
      toast.success('Password updated successfully! Please sign in.');
      onNavigate('/signin');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 🔥 Background Image & Overlay Added
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* 🌑 Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* 💳 Main Card with Shadow and rounded-3xl */}
      <div className="relative z-10 w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="text-[#e60023]" size={40} />
            <h1 className="text-3xl font-semibold text-black">CricketHub</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-black">
            {step === 'ENTER_EMAIL' && 'Reset Password'}
            {step === 'VERIFY_OTP' && 'Verify Email'}
            {step === 'NEW_PASSWORD' && 'Create New Password'}
          </h2>
          <p className="text-[#666666] text-sm">
            {step === 'ENTER_EMAIL' && 'Enter your email to receive a verification code.'}
            {step === 'VERIFY_OTP' && `We've sent a code to ${email}`}
            {step === 'NEW_PASSWORD' && 'Your new password must be different from previous used passwords.'}
          </p>
        </div>

        {/* STEP 1: EMAIL INPUT */}
        {step === 'ENTER_EMAIL' && (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              pill
              required
              className="focus:ring-2 focus:ring-[#e60023]/50 text-black"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="inline mr-2 animate-spin" size={18} /> Sending...</> : 'Send Verification Code'}
            </Button>
          </form>
        )}

        {/* STEP 2: OTP INPUT */}
        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              pill
              required
              maxLength={6}
              className="text-center tracking-widest text-lg focus:ring-2 focus:ring-[#e60023]/50 text-black"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="inline mr-2 animate-spin" size={18} /> Verifying...</> : 'Verify Code'}
            </Button>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD INPUT */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                pill
                required
                className="focus:ring-2 focus:ring-[#e60023]/50 text-black"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              pill
              required
              className="focus:ring-2 focus:ring-[#e60023]/50 text-black"
            />
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="inline mr-2 animate-spin" size={18} /> Updating...</> : 'Reset Password'}
            </Button>
          </form>
        )}

        {/* Back Button (Only show in Step 1) */}
        {step === 'ENTER_EMAIL' && (
          <button
            onClick={() => onNavigate('/signin')}
            type="button"
            className="flex items-center gap-2 text-[#e60023] mx-auto hover:underline mt-4 transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </button>
        )}
      </div>
    </div>
  );}