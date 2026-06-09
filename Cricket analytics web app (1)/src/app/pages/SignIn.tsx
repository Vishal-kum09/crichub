import { useState } from 'react';
import { Trophy, Loader2, Info } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';

type UserRole = 'viewer' | 'player' | 'scorer' | 'analyst' | 'club_admin' | 'super_admin';

interface SignInProps {
  onNavigate: (path: string, role?: UserRole) => void;
}

// Mock credentials for testing
const mockCredentials = [
  { email: 'viewer@cricket.com', password: 'viewer123', role: 'viewer' as UserRole, name: 'Viewer User' },
  { email: 'player@cricket.com', password: 'player123', role: 'player' as UserRole, name: 'Player User' },
  { email: 'scorer@cricket.com', password: 'scorer123', role: 'scorer' as UserRole, name: 'Scorer User' },
  { email: 'analyst@cricket.com', password: 'analyst123', role: 'analyst' as UserRole, name: 'Analyst User' },
  { email: 'clubadmin@cricket.com', password: 'clubadmin123', role: 'club_admin' as UserRole, name: 'Club Admin' },
  { email: 'superadmin@cricket.com', password: 'superadmin123', role: 'super_admin' as UserRole, name: 'Super Admin' },
];

export function SignIn({ onNavigate }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    // Simulate authentication delay
    setTimeout(() => {
      // Check against mock credentials
      const user = mockCredentials.find(
        (cred) => cred.email === email && cred.password === password
      );

      setIsLoading(false);

      if (user) {
        toast.success(`Welcome back, ${user.name}!`);
        onNavigate('/dashboard', user.role);
      } else {
        toast.error('Invalid email or password');
      }
    }, 1500);
  };

  const handleQuickLogin = (credential: typeof mockCredentials[0]) => {
    setEmail(credential.email);
    setPassword(credential.password);
    toast.info(`Filled credentials for ${credential.name}`);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side - Sign In Form */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="text-[#e60023]" size={40} />
                <h1 className="text-3xl font-semibold">CricketHub</h1>
              </div>
              <p className="text-[#666666]">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pill
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                pill
                required
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-[#e60023] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
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

            {/* Footer */}
            <div className="text-center text-sm">
              <span className="text-[#666666]">Don't have an account? </span>
              <button
                onClick={() => onNavigate('/signup')}
                className="text-[#e60023] hover:underline"
              >
                Sign up
              </button>
            </div>
          </div>

          {/* Right Side - Demo Credentials */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-[#e60023]" size={20} />
              <h3 className="font-semibold text-[#1a1a1a]">Demo Credentials</h3>
            </div>

            <p className="text-sm text-[#666666] mb-4">
              Click on any role below to auto-fill credentials:
            </p>

            <div className="space-y-2">
              {mockCredentials.map((credential) => (
                <button
                  key={credential.email}
                  onClick={() => handleQuickLogin(credential)}
                  className="w-full text-left p-3 border border-[#e0e0e0] rounded-lg hover:border-[#e60023] hover:bg-[#f9f9f9] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{credential.name}</p>
                      <p className="text-xs text-[#666666]">{credential.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-[#e60023]/10 text-[#e60023] text-xs font-semibold rounded uppercase">
                      {credential.role.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> All passwords are in the format: [role]123
              </p>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="text-sm text-[#e60023] hover:underline"
              >
                {showCredentials ? 'Hide' : 'Show'} Credentials Table
              </button>

              {showCredentials && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#e0e0e0]">
                        <th className="text-left py-2 font-semibold text-[#666666]">Role</th>
                        <th className="text-left py-2 font-semibold text-[#666666]">Email</th>
                        <th className="text-left py-2 font-semibold text-[#666666]">Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCredentials.map((cred) => (
                        <tr key={cred.email} className="border-b border-[#f0f0f0]">
                          <td className="py-2 font-medium text-[#1a1a1a]">{cred.role.replace('_', ' ')}</td>
                          <td className="py-2 text-[#666666]">{cred.email}</td>
                          <td className="py-2 text-[#666666]">{cred.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-[#999999] mt-6">
          Note: This is a demo system. Supabase authentication to be connected later.
        </p>
      </div>
    </div>
  );
}
