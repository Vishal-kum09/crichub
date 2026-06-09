import { useState } from 'react';
import { Trophy, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';

interface ForgotPasswordProps {
  onNavigate: (path: string) => void;
}

export function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
      toast.success('Password reset link sent to your email!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="text-[#e60023]" size={40} />
            <h1 className="text-3xl font-semibold">CricketHub</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Reset Password</h2>
          <p className="text-[#666666]">
            {submitted
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive reset instructions'}
          </p>
        </div>

        {!submitted ? (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pill
                required
              />

              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="inline mr-2 animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            {/* Back to Sign In */}
            <button
              onClick={() => onNavigate('/signin')}
              className="flex items-center gap-2 text-[#e60023] mx-auto hover:underline"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => onNavigate('/signin')} variant="primary" className="w-full">
              Back to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
