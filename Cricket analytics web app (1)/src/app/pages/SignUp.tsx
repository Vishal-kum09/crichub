import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Trophy, Mail, Lock, User, Building, Phone, Loader2, ArrowLeft, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';

interface SignUpProps {
  onNavigate: (path: string) => void;
}

interface ClubOption {
  id: string;
  name: string;
}

export function SignUp({ onNavigate }: SignUpProps) {
  const [isClubRegistration, setIsClubRegistration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [otpCode, setOtpCode] = useState('');

  // General Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Club Affiliation & Role Specific States
  const [isAffiliatedWithClub, setIsAffiliatedWithClub] = useState(false);
  const [clubsList, setClubsList] = useState<ClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>(''); 
  const [selectedRole, setSelectedRole] = useState<string>(''); 

  // Dynamic Player Specific Metadata States
  const [dob, setDob] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [nationality, setNationality] = useState('Indian');

  // Club Creation Explicit States
  const [clubName, setClubName] = useState('');
  const [homeGround, setHomeGround] = useState('');
  const [clubInitials, setClubInitials] = useState('');
  const [country, setCountry] = useState('India');

  // Retrieve approved clubs on layout mount
  useEffect(() => {
    api.get('/api/auth/clubs')
      .then(res => {
        const raw = res.data?.clubs ?? (Array.isArray(res.data) ? res.data : []);
        setClubsList(
          raw.map((club: any) => ({
            id: String(club.club_id || club.id),
            name: club.club_name || club.name || club.display_name || 'Unnamed Club',
          }))
        );
      })
      .catch(() => console.warn("Failed to fetch club directory attributes."));
  }, []);

  const handleInitiateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName) {
      toast.error('Please fill in all mandatory fields.');
      return;
    }

    if (isAffiliatedWithClub) {
      if (!selectedClubId) {
        toast.error('Please select an associated Club from the dropdown list.');
        return;
      }
      if (!selectedRole) {
        toast.error('Please assign your account operational Role.');
        return;
      }
      if (selectedRole === 'Player') {
        if (!dob || !battingStyle || !primaryRole) {
          toast.error('Please fill in all mandatory Player profile specifications.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      await api.post('/api/auth/otp/send', { email });
      toast.success('Verification OTP dispatched to your email address!');
      setStep('otp');
    } catch (err: any) {
      console.error('OTP Dispatch Failure:', err);
      toast.error(err?.response?.data?.error || 'Failed to dispatch verification parameters.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/otp/verify', { email, code: otpCode });

      if (isClubRegistration) {
        const payload = {
          club: {
            name: clubName,
            home_ground: homeGround || undefined,
            contact_number: phone || undefined,
            email: email,
            country: country,
            display_initials: clubInitials || undefined,
            owner_name: `${firstName} ${lastName}`
          },
          admin: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
            phone: phone || undefined,
            display_name: displayName || `${firstName}`
          }
        };
        await api.post('/api/auth/register/club', payload);
        setStep('success'); 
      } else {
        const payload = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password,
          phone: phone || undefined,
          display_name: displayName || `${firstName} ${lastName}`,
          club_id: isAffiliatedWithClub && selectedClubId ? selectedClubId : undefined,
          account_role: isAffiliatedWithClub ? selectedRole : 'Viewer',
          player_profile: isAffiliatedWithClub && selectedRole === 'Player' ? {
            date_of_birth: dob,
            batting_style: battingStyle,
            bowling_style: bowlingStyle || undefined,
            primary_role: primaryRole,
            jersey_number: jerseyNumber ? Number(jerseyNumber) : undefined,
            nationality: nationality
          } : undefined
        };
        
        await api.post('/api/auth/register', payload);

        if (isAffiliatedWithClub) {
          setStep('success');
        } else {
          toast.success('Registration successful! Account is ready.');
          onNavigate('/signin');
        }
      }
    } catch (err: any) {
      console.error('Registration Processing Exception:', err);
      toast.error(err?.response?.data?.error || 'OTP verification sequence invalid or registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4 text-black animate-fadeIn">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 md:p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-sm">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registration Submitted!</h2>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              {isClubRegistration ? (
                <span>Your club registration request will be verified by the Super Admin. You will receive a notification once approved!</span>
              ) : (
                <span>Your request will be verified by the club admin. Until then, enjoy <span className="text-[#e60023] font-bold">Viewer services</span>. You will receive a notification once your request is approved!</span>
              )}
            </p>
          </div>
          <button onClick={() => onNavigate('/signin')} className="w-full py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl shadow-md transition-all text-sm uppercase tracking-wider cursor-pointer">Start Enjoying Viewers App</button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4 text-black">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-red-50 text-[#e60023] rounded-2xl flex items-center justify-center mx-auto border border-red-100"><ShieldCheck size={24} /></div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Enter Verification Code</h2>
            <p className="text-xs text-gray-400 font-semibold">We have sent an authentication token link to <br/><span className="text-gray-700 font-bold">{email}</span></p>
          </div>
          <form onSubmit={handleVerifyAndRegister} className="space-y-4 font-semibold text-sm text-gray-600">
            <div className="space-y-1">
              <label>6-Digit OTP Code</label>
              <input type="text" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} className="w-full text-center tracking-[10px] font-black text-2xl py-3 bg-gray-50 border rounded-xl text-black focus:outline-none" placeholder="000000" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-[#e60023] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-base cursor-pointer">{loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Submit Registry'}</button>
            <button type="button" onClick={() => setStep('form')} className="w-full text-center text-xs text-gray-400 hover:text-black font-bold pt-2 cursor-pointer">← Edit Registration Details</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    // 🔥 Container Updated: Added Background Image, flex centering, and relative positioning
    <div 
      className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative"
      style={{
        // 🏏 Wahi Stadium Background Image
        backgroundImage: "url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* 🌑 Dark Overlay with Blur to make the card pop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* 💳 Card Wrapper Updated: Added relative, z-10, and increased shadow for depth */}
      <div className="relative z-10 max-w-2xl w-full bg-white border border-gray-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-6 text-black">
        
        {/* 🔙 Header section (Unchanged) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <button onClick={() => onNavigate('/signin')} className="text-gray-400 hover:text-black transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"><ArrowLeft size={16} /> Back to Login</button>
          <div className="flex items-center gap-2 text-[#e60023]"><Trophy size={20} /><span className="font-black tracking-tight">CricketHub</span></div>
        </div>

        {/* 📝 Title section (Unchanged) */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create your Account</h2>
          <p className="text-xs text-gray-400 font-semibold">Join the network to manage or score real fixtures</p>
        </div>

        {/* 🔄 Tabs section (Unchanged) */}
        <div className="flex bg-gray-100 p-1 rounded-xl max-w-sm mx-auto">
          <button type="button" onClick={() => { setIsClubRegistration(false); setStep('form'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isClubRegistration ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Individual User</button>
          <button type="button" onClick={() => { setIsClubRegistration(true); setStep('form'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isClubRegistration ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Register Club</button>
        </div>

        {/* 📋 Form section (Unchanged internal logic) */}
        <form onSubmit={handleInitiateSignUp} className="space-y-4 text-sm font-semibold text-gray-600">
          {/* Club Registration Fields */}
          {isClubRegistration && (
            <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100/60 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-black uppercase text-[#e60023] tracking-wider mb-1 flex items-center gap-1.5"><Building size={14} /> Club Metadata Specifications</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><label>Club Name *</label><input type="text" value={clubName} onChange={e => setClubName(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="e.g. Thunder Strikers" /></div>
                <div className="space-y-1"><label>Club Initials</label><input type="text" value={clubInitials} onChange={e => setClubInitials(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="e.g. TS" /></div>
                <div className="space-y-1"><label>Home Ground Venue</label><input type="text" value={homeGround} onChange={e => setHomeGround(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="e.g. Lords Stadium" /></div>
                <div className="space-y-1"><label>Country</label><input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" /></div>
              </div>
            </div>
          )}

          {/* User Account Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5"><User size={14} /> Account Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><label>First Name *</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="Neil" /></div>
              <div className="space-y-1"><label>Last Name *</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="Armstrong" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><label>Email Address *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="name@example.com" /></div>
              <div className="space-y-1"><label>Contact Phone Number</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="98765xxxxx" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><label>Password (Min 8 Characters) *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="••••••••" /></div>
              <div className="space-y-1"><label>Public Profile Display Name</label><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="e.g. Neil_Armstrong" /></div>
            </div>

            {/* Club Affiliation section for Individual Users */}
            {!isClubRegistration && (
              <div className="pt-2 space-y-4 border-t border-gray-100 mt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAffiliatedWithClub}
                    onChange={e => {
                      setIsAffiliatedWithClub(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedClubId('');
                        setSelectedRole('');
                      }
                    }}
                    className="w-4 h-4 text-[#e60023] focus:ring-[#e60023] border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Are you affiliated with a club?</span>
                </label>

                {isAffiliatedWithClub && (
                  <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl animate-fadeIn text-black">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase">Select Associated Club *</label>
                        <select
                          value={selectedClubId}
                          onChange={e => setSelectedClubId(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] text-gray-900 cursor-pointer"
                        >
                          <option value="">-- Choose Approved Club --</option>
                          {clubsList.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase">Select Requested Account Role *</label>
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] text-gray-900 cursor-pointer"
                        >
                          <option value="">-- Choose Role --</option>
                          <option value="Scorer/Analyst">🏏 Scorer/Analyst</option>
                          <option value="Player">🛡️ Player</option>
                          <option value="General Members">👥 General Member</option>
                        </select>
                      </div>
                    </div>

                    {/* PLAYER SPECIFIC FORM METADATA FIELDS */}
                    {selectedRole === 'Player' && (
                      <div className="pt-3 border-t border-gray-200 mt-2 space-y-3 bg-white p-4 rounded-xl border animate-slideDown">
                        <h5 className="text-xs font-black text-[#e60023] uppercase tracking-wider flex items-center gap-1"><Shield size={14}/> Player Performance Profile Parameters</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Date of Birth *</label>
                            <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Jersey Number</label>
                            <input type="number" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" placeholder="e.g. 18" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Batting Style *</label>
                            <select value={battingStyle} onChange={e => setBattingStyle(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]">
                              <option value="">-- Select Batting --</option>
                              <option value="right_hand">Right Hand Bat</option>
                              <option value="left_hand">Left Hand Bat</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Primary Role *</label>
                            <select value={primaryRole} onChange={e => setPrimaryRole(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]">
                              <option value="">-- Select Role --</option>
                              <option value="batter">Batter</option>
                              <option value="bowler">Bowler</option>
                              <option value="all_rounder">All Rounder</option>
                              <option value="wicket_keeper">Wicket Keeper</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Bowling Style</label>
                            <select value={bowlingStyle} onChange={e => setBowlingStyle(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]">
                              <option value="">-- Select Bowling --</option>
                              <option value="right_arm_fast">Right Arm Fast</option>
                              <option value="left_arm_fast">Left Arm Fast</option>
                              <option value="right_arm_off_spin">Right Arm Off Spin</option>
                              <option value="left_arm_off_spin">Left Arm Off Spin</option>
                              <option value="right_arm_leg_spin">Right Arm Leg Spin</option>
                              <option value="left_arm_unorthodox_spin_chinaman">Left Arm Unorthodox (Chinaman)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Nationality</label>
                            <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl text-black font-normal focus:ring-1 focus:ring-[#e60023]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-[#e60023] hover:bg-[#c4001e] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-base cursor-pointer transition-colors">
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Verification OTP'}
          </button>
        </form>
      </div>
    </div>
  );}