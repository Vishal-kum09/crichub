import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldAlert, Users, Landmark } from 'lucide-react';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api'; 
import { getMatchPreview, initializeMatch, setLiveSession } from '../../lib/scorerApi';
import { AudioMatchSettings, AudioSettings } from '../components/AudioCommentarySetting';

interface MatchSetupProps {
  onNavigate: (path: string, id?: string) => void;
  matchId?: string;
}

interface ServerPlayer {
  id: string;
  name: string;
  role: string;
}

export function MatchSetup({ onNavigate, matchId }: MatchSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adminMetadata, setAdminMetadata] = useState<any>(null);

  // Pool lists directly backed by database response arrays
  const [teamAPool, setTeamAPool] = useState<ServerPlayer[]>([]);
  const [teamBPool, setTeamBPool] = useState<ServerPlayer[]>([]);

  // Step 1: Team Selection Metadata
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');

  // Step 2: Playing XI Identity arrays
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [teamACaptain, setTeamACaptain] = useState('');
  const [teamBCaptain, setTeamBCaptain] = useState('');
  const [teamAWicketKeeper, setTeamAWicketKeeper] = useState('');
  const [teamBWicketKeeper, setTeamBWicketKeeper] = useState('');

  // Step 3: Toss Selection Parameters
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');

  // Step 4: UI Engine Configurations
  const [wagonWheel, setWagonWheel] = useState(true);
  const [nameDisplay, setNameDisplay] = useState('First Initial Last Name');
  
  // State hooks for commentary config
  const [commentaryMode, setCommentaryMode] = useState('auto_with_manual_override');
  const [commentaryStyle, setCommentaryStyle] = useState('broadcast_english');

  // 🔥 Audio Settings State (LIFTED UP FOR SINGLE SAVE BUTTON)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    audio_enabled: true,
    provider: 'gemini',
    provider_model: 'gemini-2.5-flash-tts',
    provider_voice: 'Fenrir',
    language_code: 'en-GB',
    character_key: 'veteran',
    tone: 'normal',
    speaking_rate: 1.00,
    character_prompt: ''
  });

  // Hidden State
  const [matchType, setMatchType] = useState('T20');
  const [totalOvers, setTotalOvers] = useState('');
  const [oversPerBowler, setOversPerBowler] = useState('');
  const [venue, setVenue] = useState('');
  const [ground, setGround] = useState('');
  const [country, setCountry] = useState('');

  // Step 5: Live Initial Active Bowlers/Batters state hooks
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [openingBowler, setOpeningBowler] = useState('');

  const totalSteps = 5;
  const stepsList = ['Schedule', 'Playing XI', 'Toss Field', 'Settings Config', 'Strike Deck'];

  // FETCH: Load Assigned Match Administrative Parameters + Existing Audio Settings
  useEffect(() => {
    if (!matchId) return;

    setLoading(true);
    
    getMatchPreview(matchId)
      .then((data) => {
        setAdminMetadata(data);
        setTeamA(data.team1_name);
        setTeamB(data.team2_name);
        setTeamAId(data.team1_id);
        setTeamBId(data.team2_id);
        setVenue(data.venue || '');
        setGround(data.ground || '');
        setCountry(data.country || 'India');
        setMatchType(data.format || 'T20');
        setTotalOvers(data.total_overs?.toString() || '20');
        setOversPerBowler(data.overs_per_bowler?.toString() || '4');
        setTeamAPool(data.team1_roster ?? []);
        setTeamBPool(data.team2_roster ?? []);
      })
      .catch((err) => {
        console.error("Match context synchronization error:", err);
        toast.error("Could not fetch assigned match rosters from server.");
      })
      .finally(() => setLoading(false));

    // Fetch existing audio settings
    api.get(`/api/scorer/matches/${matchId}/audio-settings`)
      .then((res) => {
        if (res.data && res.data.settings) {
          setAudioSettings(res.data.settings);
        }
      })
      .catch((err) => console.log('No existing audio settings found, defaults will apply.'));

  }, [matchId]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return teamA && teamB;
      case 2: return teamAPlayers.length === 11 && teamBPlayers.length === 11 && teamACaptain && teamBCaptain && teamAWicketKeeper && teamBWicketKeeper;
      case 3: return tossWinner && tossDecision;
      case 4: return true; 
      case 5: return striker && nonStriker && openingBowler && striker !== nonStriker;
      default: return false;
    }
  };

  const playerIdFor = (name: string, pool: ServerPlayer[]) => pool.find((p) => p.name === name)?.id || name;

  // 🔥 THIS IS THE SINGLE LAUNCH FUNCTION DOING EVERYTHING
  const startMatch = async () => {
    if (matchId && teamAId && teamBId) {
      try {
        const isLocalDerby = teamAId === teamBId;

        // 1️⃣ Initialize Match Config
        const res = await initializeMatch(matchId, {
          batting_team_id: battingTeam === teamA ? teamAId : teamBId,
          fielding_team_id: bowlingTeam === teamA ? teamAId : teamBId,
          innings_number: 1,
          striker_id: playerIdFor(striker, battingTeam === teamA ? teamAPool : teamBPool),
          non_striker_id: playerIdFor(nonStriker, battingTeam === teamA ? teamAPool : teamBPool),
          bowler_id: playerIdFor(openingBowler, bowlingTeam === teamA ? teamAPool : teamBPool),
          
          toss_winner: tossWinner === teamA ? teamAId : teamBId,
          toss_decision: tossDecision,
          total_overs: parseInt(totalOvers),
          overs_per_bowler: parseInt(oversPerBowler),
          
          playing_xi_a: teamAPlayers.map(n => playerIdFor(n, teamAPool)),
          playing_xi_b: teamBPlayers.map(n => playerIdFor(n, teamBPool)),
          captain_a: playerIdFor(teamACaptain, teamAPool),
          captain_b: playerIdFor(teamBCaptain, teamBPool),
          wicketkeeper_a: playerIdFor(teamAWicketKeeper, teamAPool),
          wicketkeeper_b: playerIdFor(teamBWicketKeeper, teamBPool),

          metadata: {
            is_local_derby: isLocalDerby,
            batting_team_label: battingTeam,
            fielding_team_label: bowlingTeam,
            wagon_wheel_enabled: wagonWheel, // Wagon Wheel Flag
            commentary_mode: commentaryMode,
            commentary_style: commentaryStyle,
            name_display_format: nameDisplay
          }
        } as any);

        // 2️⃣ Save Audio Settings in the SAME click event
        try {
          await api.post(`/api/scorer/matches/${matchId}/audio-settings`, audioSettings);
          console.log("Audio Settings automatically saved on launch!");
        } catch (audioErr) {
          console.error("Failed to save audio settings, but match initialized:", audioErr);
          toast.error("Match launched, but audio configuration failed to save.");
        }

        // 3️⃣ Set Local Scoring Session
        const fullPlayerPool = [...teamAPool, ...teamBPool];
        const generatedPlayerIdMap: { [key: string]: string } = {};
        fullPlayerPool.forEach(player => { generatedPlayerIdMap[player.name] = player.id; });

        setLiveSession({
          matchId,
          inningsId: res.innings.innings_id,
          strikerId: res.striker?.player_id || striker,
          nonStrikerId: res.non_striker?.player_id || nonStriker,
          bowlerId: res.bowler?.player_id || openingBowler,
          playerNames: {
            [res.striker?.player_id || 'striker']: striker,
            [res.non_striker?.player_id || 'non-striker']: nonStriker,
            [res.bowler?.player_id || 'bowler']: openingBowler
          },         
          battingRoster: battingTeam === teamA ? teamAPlayers : teamBPlayers,
          fieldingRoster: bowlingTeam === teamA ? teamAPlayers : teamBPlayers,
          playerIdMap: generatedPlayerIdMap 
        });

        toast.success('Match Config & Audio Settings Successfully Synced!');
        onNavigate('/scorer', matchId);
        return;
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to sync match setup config.');
        return;
      }
    }

    toast.success('Match initialized locally (Demo Mode).');
    onNavigate('/scorer');
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error('Please complete all required fields configuration values.');
      return;
    }
    // If Step 5, launch the match (executes startMatch)
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else void startMatch();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else onNavigate('/scorer-dashboard');
  };

  const togglePlayerSelection = (team: 'A' | 'B', playerName: string) => {
    if (team === 'A') {
      if (teamAPlayers.includes(playerName)) {
        setTeamAPlayers(teamAPlayers.filter(p => p !== playerName));
        if (teamACaptain === playerName) setTeamACaptain('');
        if (teamAWicketKeeper === playerName) setTeamAWicketKeeper('');
      } else if (teamAPlayers.length < 11) setTeamAPlayers([...teamAPlayers, playerName]);
      else toast.error('Maximum 11 players allowed.');
    } else {
      if (teamBPlayers.includes(playerName)) {
        setTeamBPlayers(teamBPlayers.filter(p => p !== playerName));
        if (teamBCaptain === playerName) setTeamBCaptain('');
        if (teamBWicketKeeper === playerName) setTeamBWicketKeeper('');
      } else if (teamBPlayers.length < 11) setTeamBPlayers([...teamBPlayers, playerName]);
      else toast.error('Maximum 11 players allowed.');
    }
  };

  const battingTeam = tossDecision === 'bat' ? tossWinner : tossWinner === teamA ? teamB : teamA;
  const battingPlayers = battingTeam === teamA ? teamAPlayers : teamBPlayers;
  const bowlingTeam = battingTeam === teamA ? teamB : teamA;
  const bowlingPlayers = bowlingTeam === teamA ? teamAPlayers : teamBPlayers;

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Syncing administrative match token rosters...</div>;

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-8 px-4 text-black">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Match Setup Controller</h1>
            <p className="text-sm text-gray-500 mt-1">Configure parameters and squads for active server sync</p>
          </div>
          {matchId && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm hidden sm:block">
              🔗 Linked to Instance ID: {matchId.substring(0, 8)}...
            </span>
          )}
        </div>

        <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="relative flex justify-between z-10 max-w-3xl mx-auto px-2">
            <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 -z-10 transform -translate-y-1/2 rounded" />
            <div 
              className="absolute top-5 left-8 h-1 bg-emerald-600 -z-10 transform -translate-y-1/2 rounded transition-all duration-300" 
              style={{ width: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - 4rem)` }}
            />
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={step} className="flex flex-col items-center gap-2 w-16 sm:w-20">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all shadow-sm ${
                  step < currentStep ? 'bg-emerald-600 text-white' :
                  step === currentStep ? 'bg-[#e60023] text-white ring-4 ring-red-100' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step < currentStep ? <Check size={18} strokeWidth={3} /> : step}
                </div>
                <span className={`text-[9px] sm:text-[11px] uppercase tracking-wider font-extrabold text-center ${step === currentStep ? 'text-[#e60023]' : 'text-gray-400'}`}>
                  {stepsList[index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8 mb-6">
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Landmark className="text-[#e60023]" size={22} />
                <h2 className="text-xl font-black text-gray-900">Match Details : </h2>
              </div>
              {matchId ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center space-y-4">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Match Configuration</p>
                  <p className="text-2xl font-black text-gray-900">{teamA} <span className="text-red-500 text-lg font-normal">vs</span> {teamB}</p>
                  <p className="text-xs text-gray-500 font-semibold bg-white border px-3 py-1.5 rounded-xl max-w-md mx-auto shadow-inner">📍 Venue/Ground: {venue} {ground ? `| ${ground}` : ''}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs font-bold text-yellow-800 flex items-center gap-2">
                  <ShieldAlert size={18} /> Freelance Demo Setup active. Values chosen will not register against database.
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="text-[#e60023]" size={22} />
                <h2 className="text-xl font-black text-gray-900">Step 2: Lock Active Playing XI Squads</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-extrabold text-gray-800 text-sm bg-gray-50 p-2.5 rounded-lg border flex justify-between">
                    <span>{teamA} Pool</span>
                    <span className="text-[#e60023] font-black">{teamAPlayers.length}/11 Selected</span>
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50/30">
                    {teamAPool.map((p) => (
                      <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        teamAPlayers.includes(p.name) ? 'bg-red-50 text-[#e60023] border-red-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-100'
                      }`}>
                        <input type="checkbox" checked={teamAPlayers.includes(p.name)} onChange={() => togglePlayerSelection('A', p.name)} className="w-4 h-4 accent-[#e60023]" />
                        <span className="flex-1 truncate">{p.name}</span><span className="text-[10px] text-gray-400 font-normal">({p.role})</span>
                      </label>
                    ))}
                  </div>

                  {teamAPlayers.length === 11 && (
                    <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                      <div><label className="block text-[11px] font-bold text-gray-400 mb-1">Captain</label>
                        <select value={teamACaptain} onChange={e => setTeamACaptain(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                          <option value="">Select</option>{teamAPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div><label className="block text-[11px] font-bold text-gray-400 mb-1">Keeper</label>
                        <select value={teamAWicketKeeper} onChange={e => setTeamAWicketKeeper(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                          <option value="">Select</option>{teamAPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-extrabold text-gray-800 text-sm bg-gray-50 p-2.5 rounded-lg border flex justify-between">
                    <span>{teamB} Pool</span>
                    <span className="text-[#e60023] font-black">{teamBPlayers.length}/11 Selected</span>
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50/30">
                    {teamBPool.map((p) => (
                      <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        teamBPlayers.includes(p.name) ? 'bg-red-50 text-[#e60023] border-red-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-100'
                      }`}>
                        <input type="checkbox" checked={teamBPlayers.includes(p.name)} onChange={() => togglePlayerSelection('B', p.name)} className="w-4 h-4 accent-[#e60023]" />
                        <span className="flex-1 truncate">{p.name}</span><span className="text-[10px] text-gray-400 font-normal">({p.role})</span>
                      </label>
                    ))}
                  </div>

                  {teamBPlayers.length === 11 && (
                    <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                      <div><label className="block text-[11px] font-bold text-gray-400 mb-1">Captain</label>
                        <select value={teamBCaptain} onChange={e => setTeamBCaptain(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                          <option value="">Select</option>{teamBPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div><label className="block text-[11px] font-bold text-gray-400 mb-1">Keeper</label>
                        <select value={teamBWicketKeeper} onChange={e => setTeamBWicketKeeper(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                          <option value="">Select</option>{teamBPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-black text-gray-900 border-b pb-2">Step 3: Toss Records</h2>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-500">Who won the toss?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setTossWinner(teamA)} className={`p-5 rounded-2xl font-bold transition-all border ${tossWinner === teamA ? 'bg-[#e60023] text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>{teamA}</button>
                  <button onClick={() => setTossWinner(teamB)} className={`p-5 rounded-2xl font-bold transition-all border ${tossWinner === teamB ? 'bg-[#e60023] text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>{teamB}</button>
                </div>
              </div>

              {tossWinner && (
                <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <label className="block text-sm font-bold text-gray-500">Toss Decision</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setTossDecision('bat')} className={`p-5 rounded-2xl font-black text-base border transition-all ${tossDecision === 'bat' ? 'bg-emerald-600 text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700'}`}>BAT FIRST</button>
                    <button onClick={() => setTossDecision('bowl')} className={`p-5 rounded-2xl font-black text-base border transition-all ${tossDecision === 'bowl' ? 'bg-blue-600 text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700'}`}>BOWL FIRST</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-black text-gray-900 border-b pb-2">Step 4: UI Engine Configurations</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-bold">
                
                <div>
                  <label className="block text-gray-500 mb-1">Wagon-Wheel Tracking</label>
                  <select 
                    value={wagonWheel ? 'enabled' : 'disabled'} 
                    onChange={e => setWagonWheel(e.target.value === 'enabled')} 
                    className="w-full p-3 border rounded-xl bg-white outline-none focus:border-[#e60023]"
                  >
                    <option value="enabled">Enabled (Track batting directions)</option>
                    <option value="disabled">Disabled (Standard numerical scoring)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1">Player UI Display Name Format</label>
                  <select 
                    value={nameDisplay} 
                    onChange={e => setNameDisplay(e.target.value)} 
                    className="w-full p-3 border rounded-xl bg-white outline-none focus:border-[#e60023]"
                  >
                    <option value="First Initial Last Name">First Initial Last Name (e.g., J Bumrah)</option>
                    <option value="First Name Last Name">First Name Last Name (e.g., Jasprit Bumrah)</option>
                    <option value="First Name Last Initial">First Name Last Initial (e.g., Jasprit B)</option>
                  </select>
                </div>

                {/* AI COMMENTARY CONFIGURATION */}
                <div className="sm:col-span-2 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900">🎙️ AI Commentary Configuration</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Operation Mode</label>
                      <select 
                        value={commentaryMode} 
                        onChange={(e) => setCommentaryMode(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded-xl outline-none focus:border-[#e60023]"
                      >
                        <option value="auto_with_manual_override">Auto (AI) + Manual Override</option>
                        <option value="manual_only">Manual Only (No AI)</option>
                        <option value="off">Disabled</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Commentary Style</label>
                      <select 
                        value={commentaryStyle} 
                        onChange={(e) => setCommentaryStyle(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded-xl outline-none focus:border-[#e60023]"
                        disabled={commentaryMode === 'off' || commentaryMode === 'manual_only'}
                      >
                        <option value="broadcast_english">Standard Broadcast (English)</option>
                        <option value="analytical">Data & Analytical Focus</option>
                        <option value="dramatic">Dramatic & Exciting</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Audio Settings Render */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Broadcast & Audio Settings</h3>
                {matchId ? (
                  commentaryMode === 'off' || commentaryMode === 'manual_only' ? (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 flex items-center gap-2">
                      <ShieldAlert size={18} />
                      Audio commentary cannot be configured because AI Text Commentary mode is disabled or set to manual.
                    </div>
                  ) : (
                    <AudioMatchSettings 
                      settings={audioSettings} 
                      onChange={setAudioSettings} 
                    />
                  )
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 italic">
                    Audio configurations will be available once the match instance is fully synced.
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-black text-gray-900 border-b pb-2">Step 5: Operational Launch Deck</h2>
              <div className="bg-red-50/50 p-4 rounded-xl border text-center font-bold text-sm text-[#e60023] mb-4">🏏 Batting First: {battingTeam} | 🥎 Bowling: {bowlingTeam}</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm font-bold">
                <div><label className="block text-gray-500 mb-1">Select Striker Batsman *</label>
                  <select value={striker} onChange={e => setStriker(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                    <option value="">Select Striker</option>{battingPlayers.map(n => <option key={n} value={n} disabled={n === nonStriker}>{n}</option>)}
                  </select>
                </div>
                <div><label className="block text-gray-500 mb-1">Select Non-Striker *</label>
                  <select value={nonStriker} onChange={e => setNonStriker(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                    <option value="">Select Non-Striker</option>{battingPlayers.map(n => <option key={n} value={n} disabled={n === striker}>{n}</option>)}
                  </select>
                </div>
                <div><label className="block text-gray-500 mb-1">Select Opening Bowler *</label>
                  <select value={openingBowler} onChange={e => setOpeningBowler(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                    <option value="">Select Bowler</option>{bowlingPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-between items-center">
          <button onClick={handleBack} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} />{currentStep === 1 ? 'Discard Setup' : 'Back'}
          </button>
          
          <span className="text-xs font-bold text-gray-400">Step {currentStep} / {totalSteps}</span>
          
          <button onClick={handleNext} disabled={!canProceed()} className="px-6 py-3 bg-[#e60023] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-red-700 transition-all flex items-center gap-1.5 text-sm shadow-md">
            {currentStep === totalSteps ? (<><Check size={16} strokeWidth={3} /> Launch Scoring Console</>) : (<>Next <ArrowRight size={16} /></>)}
          </button>
        </div>

      </div>
    </div>
  );
}