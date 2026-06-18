import { useState } from 'react';
import { Trophy, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';
import { login, toAppRole, defaultRouteForRole } from '../../lib/authApi';

type UserRole = 'viewer' | 'player' | 'scorer' | 'analyst' | 'club_admin' | 'super_admin';

interface SignInProps {
  onNavigate: (path: string, role?: UserRole, displayName?: string) => void;
}

export function SignIn({ onNavigate }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await login(email, password);
      const role = toAppRole(user.role);
      toast.success(`Welcome back, ${user.display_name}!`);
      onNavigate(defaultRouteForRole(role), role, user.display_name);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        // 🏏 Stadium Background Image (Aap chaho toh link change kar sakte ho)
        backgroundImage: "url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* 🌑 Dark Overlay with Blur to make the white card pop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* 💳 Premium Floating Card */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20">
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="text-[#e60023]" size={40} />
            <h1 className="text-3xl font-semibold">CricketHub</h1>
          </div>
          <p className="text-[#666666]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            pill
            required
            className="focus:ring-2 focus:ring-[#e60023]/50" // Added slight focus ring
          />
          
          {/* 🔥 PASSWORD INPUT WITH EYE ICON & FORGOT LINK */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                pill
                required
                className="focus:ring-2 focus:ring-[#e60023]/50" // Added slight focus ring
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-sm font-medium text-[#e60023] hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="inline mr-2 animate-spin" size={18} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center text-sm mt-6">
          <span className="text-[#666666]">Don't have an account? </span>
          <button
            onClick={() => onNavigate('/signup')}
            className="text-[#e60023] font-medium hover:underline"
          >
            Sign up
          </button>
        </div>
        
      </div>
    </div>
  );
}