import { useState } from 'react';
import { Trophy, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';

interface SignUpProps {
  onNavigate: (path: string) => void;
}

type SignUpType = 'individual' | 'club';
type UserRole = 'player' | 'scorer' | 'analyst' | 'umpire';

export function SignUp({ onNavigate }: SignUpProps) {
  const [signUpType, setSignUpType] = useState<SignUpType | null>(null);
  const [step, setStep] = useState(1);

  // Individual sign-up fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasClubAffiliation, setHasClubAffiliation] = useState<boolean | null>(null);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [otpCode, setOtpCode] = useState('');

  // Club sign-up fields
  const [clubName, setClubName] = useState('');
  const [homeGround, setHomeGround] = useState('');
  const [clubContact, setClubContact] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [country, setCountry] = useState('');
  const [clubDisplayName, setClubDisplayName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Mock clubs list
  const clubs = [
    'Mumbai Indians Cricket Academy',
    'Chennai Super Kings Academy',
    'Royal Challengers Bangalore Club',
    'Kolkata Knight Riders Academy',
    'Delhi Capitals Cricket Club',
  ];

  const roles: { value: UserRole; label: string }[] = [
    { value: 'player', label: 'Player' },
    { value: 'scorer', label: 'Scorer' },
    { value: 'analyst', label: 'Analyst' },
    { value: 'umpire', label: 'Umpire' },
  ];

  const handleIndividualNext = () => {
    if (step === 1) {
      // Validate core credentials
      if (!firstName.trim() || !lastName.trim() || !displayName.trim()) {
        toast.error('Please enter your full name and display name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      if (!phone.trim() || phone.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate club affiliation selection
      if (hasClubAffiliation === null) {
        toast.error('Please select if you are affiliated with a club');
        return;
      }
      if (hasClubAffiliation) {
        if (!selectedClub) {
          toast.error('Please select your club');
          return;
        }
        if (!selectedRole) {
          toast.error('Please select your role');
          return;
        }
      }
      setStep(3);
    } else if (step === 3) {
      // Validate OTP
      if (otpCode.length !== 6) {
        toast.error('Please enter the 6-digit OTP sent to your phone');
        return;
      }
      toast.success('OTP verified successfully!');
      setStep(4); // Pending approval state
    }
  };

  const handleClubSignUp = () => {
    if (!clubName.trim() || !homeGround.trim() || !clubContact.trim() || !clubEmail.trim() || !country.trim() || !clubDisplayName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!clubEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Club registration submitted for Super Admin approval!');
    setStep(4); // Pending approval state
  };

  // Type selection screen
  if (!signUpType) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="text-[#e60023]" size={40} />
              <h1 className="text-3xl font-semibold">CricketHub</h1>
            </div>
            <p className="text-[#666666]">Choose your registration type</p>
          </div>

          {/* Type Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSignUpType('individual')}
              className="bg-white rounded-xl p-6 border-2 border-[#e0e0e0] hover:border-[#e60023] transition-all text-left group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#e60023]/20 transition-colors">
                <Trophy size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">Individual</h3>
              <p className="text-sm text-[#666666]">
                Register as a Player, Scorer, Analyst, or Umpire
              </p>
            </button>

            <button
              onClick={() => setSignUpType('club')}
              className="bg-white rounded-xl p-6 border-2 border-[#e0e0e0] hover:border-[#e60023] transition-all text-left group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#e60023]/20 transition-colors">
                <Trophy size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">Club / Academy</h3>
              <p className="text-sm text-[#666666]">
                Register your cricket club or academy
              </p>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm">
            <span className="text-[#666666]">Already have an account? </span>
            <button
              onClick={() => onNavigate('/signin')}
              className="text-[#e60023] hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Individual Sign-Up Flow
  if (signUpType === 'individual') {
    // Pending Approval State
    if (step === 4) {
      return (
        <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2">Registration Submitted!</h2>
              <p className="text-[#666666] mb-4">
                Your registration will be looked after. Until then, enjoy the web services.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="font-semibold text-[#1a1a1a] mb-3">What's Next?</h3>
              <ul className="space-y-2 text-sm text-[#666666]">
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>Your {hasClubAffiliation && selectedClub ? 'club admin' : 'account'} will review your registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>You can access all viewer features while waiting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>Full {selectedRole || 'user'} features will unlock upon approval</span>
                </li>
              </ul>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => onNavigate('/signin')}
            >
              Continue to Sign In
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Back Button */}
          <button
            onClick={() => step === 1 ? setSignUpType(null) : setStep(step - 1)}
            className="flex items-center gap-2 text-[#e60023] hover:underline"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="text-[#e60023]" size={40} />
              <h1 className="text-3xl font-semibold">CricketHub</h1>
            </div>
            <p className="text-[#666666]">Individual Registration - Step {step} of 3</p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-[#e60023]' : 'bg-[#e0e0e0]'}`} />
            <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-[#e60023]' : 'bg-[#e0e0e0]'}`} />
            <div className={`flex-1 h-1 rounded ${step >= 3 ? 'bg-[#e60023]' : 'bg-[#e0e0e0]'}`} />
          </div>

          {/* Step 1: Core Credentials */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  pill
                  required
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  pill
                  required
                />
              </div>
              <Input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                pill
                required
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pill
                required
              />
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pill
                required
              />
              <Input
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                pill
                required
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                pill
                required
              />

              <Button variant="primary" className="w-full" onClick={handleIndividualNext}>
                Next
              </Button>
            </div>
          )}

          {/* Step 2: Club Affiliation */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
                <p className="text-sm font-semibold text-[#1a1a1a] mb-3">Are you affiliated with a club?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasClubAffiliation(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      hasClubAffiliation === true
                        ? 'border-[#e60023] bg-[#e60023]/10 text-[#e60023]'
                        : 'border-[#e0e0e0] text-[#666666] hover:border-[#e60023]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasClubAffiliation(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      hasClubAffiliation === false
                        ? 'border-[#e60023] bg-[#e60023]/10 text-[#e60023]'
                        : 'border-[#e0e0e0] text-[#666666] hover:border-[#e60023]'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {hasClubAffiliation === true && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">Select Your Club</label>
                    <select
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-full focus:outline-none focus:border-[#e60023] transition-colors bg-white"
                    >
                      <option value="">Choose a club...</option>
                      {clubs.map((club) => (
                        <option key={club} value={club}>{club}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">Select Your Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          onClick={() => setSelectedRole(role.value)}
                          className={`py-2 px-4 rounded-lg border-2 transition-all ${
                            selectedRole === role.value
                              ? 'border-[#e60023] bg-[#e60023]/10 text-[#e60023]'
                              : 'border-[#e0e0e0] text-[#666666] hover:border-[#e60023]'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {hasClubAffiliation === false && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    You will be registered as a Viewer. You can request role upgrades later from the platform administrators.
                  </p>
                </div>
              )}

              <Button variant="primary" className="w-full" onClick={handleIndividualNext}>
                Next
              </Button>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
                <p className="text-sm text-[#666666] mb-4">
                  We've sent a 6-digit verification code to
                </p>
                <p className="font-semibold text-[#1a1a1a] mb-4">{phone}</p>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  pill
                  required
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <button className="text-sm text-[#e60023] hover:underline mt-3">
                  Resend OTP
                </button>
              </div>

              <Button variant="primary" className="w-full" onClick={handleIndividualNext}>
                Verify & Complete
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Club Sign-Up Flow
  if (signUpType === 'club') {
    // Pending Approval State
    if (step === 4) {
      return (
        <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2">Club Registration Submitted!</h2>
              <p className="text-[#666666] mb-4">
                Your club registration has been sent to the Super Admin for approval.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="font-semibold text-[#1a1a1a] mb-3">What's Next?</h3>
              <ul className="space-y-2 text-sm text-[#666666]">
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>Super Admin will review your club registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>You can access viewer features while waiting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e60023] mt-0.5">•</span>
                  <span>Full Club Admin features will unlock upon approval</span>
                </li>
              </ul>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => onNavigate('/signin')}
            >
              Continue to Sign In
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSignUpType(null)}
            className="flex items-center gap-2 text-[#e60023] hover:underline"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="text-[#e60023]" size={40} />
              <h1 className="text-3xl font-semibold">CricketHub</h1>
            </div>
            <p className="text-[#666666]">Club / Academy Registration</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Club / Academy name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              pill
              required
            />
            <Input
              type="text"
              placeholder="Home ground"
              value={homeGround}
              onChange={(e) => setHomeGround(e.target.value)}
              pill
              required
            />
            <Input
              type="tel"
              placeholder="Contact number"
              value={clubContact}
              onChange={(e) => setClubContact(e.target.value)}
              pill
              required
            />
            <Input
              type="email"
              placeholder="Email address"
              value={clubEmail}
              onChange={(e) => setClubEmail(e.target.value)}
              pill
              required
            />
            <Input
              type="text"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              pill
              required
            />
            <Input
              type="text"
              placeholder="Display name"
              value={clubDisplayName}
              onChange={(e) => setClubDisplayName(e.target.value)}
              pill
              required
            />
            <Input
              type="text"
              placeholder="Owner name (optional)"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              pill
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Your registration will be sent to the Super Admin for approval.
              </p>
            </div>

            <Button variant="primary" className="w-full" onClick={handleClubSignUp}>
              Submit Registration
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
