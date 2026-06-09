import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from '../../lib/toast';
import { mockTeams, mockPlayers } from '../../data/mockData';
import { initializeMatch, setLiveSession } from '../../lib/scorerApi';

interface MatchSetupProps {
  onNavigate: (path: string, id?: string) => void;
  // Present when the wizard is backed by a real, assigned match — required to
  // open a live innings against the DB. The mock wizard has no backing match.
  matchId?: string;
}

export function MatchSetup({ onNavigate, matchId }: MatchSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Team Selection
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  // Step 2: Playing XI
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [teamACaptain, setTeamACaptain] = useState('');
  const [teamBCaptain, setTeamBCaptain] = useState('');
  const [teamAWicketKeeper, setTeamAWicketKeeper] = useState('');
  const [teamBWicketKeeper, setTeamBWicketKeeper] = useState('');

  // Step 3: Toss
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');

  // Step 4: Match Settings
  const [matchType, setMatchType] = useState('T20');
  const [totalOvers, setTotalOvers] = useState('20');
  const [oversPerBowler, setOversPerBowler] = useState('4');
  const [venue, setVenue] = useState('');
  const [ground, setGround] = useState('');
  const [country, setCountry] = useState('');
  const [wagonWheel, setWagonWheel] = useState(true);
  const [nameDisplay, setNameDisplay] = useState<'full' | 'short'>('full');

  // Step 5: Match Start
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [openingBowler, setOpeningBowler] = useState('');

  const totalSteps = 5;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return teamA && teamB && teamA !== teamB;
      case 2:
        return (
          teamAPlayers.length === 11 &&
          teamBPlayers.length === 11 &&
          teamACaptain &&
          teamBCaptain &&
          teamAWicketKeeper &&
          teamBWicketKeeper
        );
      case 3:
        return tossWinner && tossDecision;
      case 4:
        return matchType && totalOvers && oversPerBowler && venue && ground && country;
      case 5:
        return striker && nonStriker && openingBowler;
      default:
        return false;
    }
  };

  // Resolve a display name back to its catalogue id (teams/players).
  const teamIdFor = (name: string) => mockTeams.find((t) => t.name === name)?.id;
  const playerIdFor = (name: string) => mockPlayers.find((p) => p.name === name)?.id;

  const startMatch = async () => {
    const battingTeamId = teamIdFor(battingTeam);
    const fieldingTeamId = teamIdFor(bowlingTeam);

    // Open the first innings against the DB when this wizard is backed by a real
    // assigned match. Otherwise fall through to the local demo navigation.
    if (matchId && battingTeamId && fieldingTeamId) {
      try {
        const res = await initializeMatch(matchId, {
          batting_team_id: battingTeamId,
          fielding_team_id: fieldingTeamId,
          innings_number: 1,
          striker_id: playerIdFor(striker),
          non_striker_id: playerIdFor(nonStriker),
          bowler_id: playerIdFor(openingBowler),
        });
        setLiveSession({
          matchId,
          inningsId: res.innings.innings_id,
          strikerId: res.striker?.player_id ?? playerIdFor(striker),
          nonStrikerId: res.non_striker?.player_id ?? playerIdFor(nonStriker),
          bowlerId: res.bowler?.player_id ?? playerIdFor(openingBowler),
        });
        toast.success('Live innings started');
        onNavigate('/scorer', matchId);
        return;
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to start live innings');
        return;
      }
    }

    // Demo mode (no backing match): proceed without hitting the DB.
    toast.success('Match setup complete!');
    onNavigate('/scorer');
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error('Please complete all required fields');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - start match
      void startMatch();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onNavigate('/matches');
    }
  };

  const togglePlayerSelection = (team: 'A' | 'B', playerName: string) => {
    if (team === 'A') {
      if (teamAPlayers.includes(playerName)) {
        setTeamAPlayers(teamAPlayers.filter(p => p !== playerName));
      } else if (teamAPlayers.length < 11) {
        setTeamAPlayers([...teamAPlayers, playerName]);
      } else {
        toast.error('Maximum 11 players allowed');
      }
    } else {
      if (teamBPlayers.includes(playerName)) {
        setTeamBPlayers(teamBPlayers.filter(p => p !== playerName));
      } else if (teamBPlayers.length < 11) {
        setTeamBPlayers([...teamBPlayers, playerName]);
      } else {
        toast.error('Maximum 11 players allowed');
      }
    }
  };

  const battingTeam = tossDecision === 'bat' ? tossWinner : tossWinner === teamA ? teamB : teamA;
  const battingPlayers = battingTeam === teamA ? teamAPlayers : teamBPlayers;
  const bowlingTeam = battingTeam === teamA ? teamB : teamA;
  const bowlingPlayers = bowlingTeam === teamA ? teamAPlayers : teamBPlayers;

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2">Match Setup</h1>
          <p className="text-[#666666]">Configure your match settings in 5 easy steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step < currentStep
                      ? 'bg-green-600 text-white'
                      : step === currentStep
                      ? 'bg-[#e60023] text-white ring-4 ring-red-100'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? <Check size={20} /> : step}
                </div>
                {step < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-[#666666]">
            <span>Teams</span>
            <span>Playing XI</span>
            <span>Toss</span>
            <span>Settings</span>
            <span>Start</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Step 1: Team Selection */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Step 1: Select Teams</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Team A *
                  </label>
                  <select
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    className="w-full p-4 border-2 border-[#e0e0e0] rounded-xl focus:outline-none focus:border-[#e60023] text-lg"
                  >
                    <option value="">Select Team A</option>
                    {mockTeams.map((team) => (
                      <option key={team.id} value={team.name} disabled={team.name === teamB}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Team B *
                  </label>
                  <select
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    className="w-full p-4 border-2 border-[#e0e0e0] rounded-xl focus:outline-none focus:border-[#e60023] text-lg"
                  >
                    <option value="">Select Team B</option>
                    {mockTeams.map((team) => (
                      <option key={team.id} value={team.name} disabled={team.name === teamA}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {teamA && teamB && (
                <div className="mt-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-center text-lg font-semibold text-green-800">
                    {teamA} vs {teamB}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Playing XI */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Step 2: Select Playing XI</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A Players */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#1a1a1a]">
                    {teamA} ({teamAPlayers.length}/11)
                  </h3>
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {mockPlayers
                      .filter((p) => p.team === teamA)
                      .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => togglePlayerSelection('A', player.name)}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            teamAPlayers.includes(player.name)
                              ? 'bg-[#e60023] text-white font-semibold'
                              : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {player.name} - {player.role}
                        </button>
                      ))}
                  </div>

                  {teamAPlayers.length === 11 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Captain *</label>
                        <select
                          value={teamACaptain}
                          onChange={(e) => setTeamACaptain(e.target.value)}
                          className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                        >
                          <option value="">Select Captain</option>
                          {teamAPlayers.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Wicketkeeper *</label>
                        <select
                          value={teamAWicketKeeper}
                          onChange={(e) => setTeamAWicketKeeper(e.target.value)}
                          className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                        >
                          <option value="">Select Wicketkeeper</option>
                          {teamAPlayers.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Team B Players */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#1a1a1a]">
                    {teamB} ({teamBPlayers.length}/11)
                  </h3>
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {mockPlayers
                      .filter((p) => p.team === teamB)
                      .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => togglePlayerSelection('B', player.name)}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            teamBPlayers.includes(player.name)
                              ? 'bg-[#e60023] text-white font-semibold'
                              : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {player.name} - {player.role}
                        </button>
                      ))}
                  </div>

                  {teamBPlayers.length === 11 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Captain *</label>
                        <select
                          value={teamBCaptain}
                          onChange={(e) => setTeamBCaptain(e.target.value)}
                          className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                        >
                          <option value="">Select Captain</option>
                          {teamBPlayers.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Wicketkeeper *</label>
                        <select
                          value={teamBWicketKeeper}
                          onChange={(e) => setTeamBWicketKeeper(e.target.value)}
                          className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                        >
                          <option value="">Select Wicketkeeper</option>
                          {teamBPlayers.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Toss */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Step 3: Toss</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Toss Winner *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTossWinner(teamA)}
                      className={`p-6 rounded-xl font-semibold text-lg transition-all ${
                        tossWinner === teamA
                          ? 'bg-[#e60023] text-white ring-4 ring-red-100'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      {teamA}
                    </button>
                    <button
                      onClick={() => setTossWinner(teamB)}
                      className={`p-6 rounded-xl font-semibold text-lg transition-all ${
                        tossWinner === teamB
                          ? 'bg-[#e60023] text-white ring-4 ring-red-100'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      {teamB}
                    </button>
                  </div>
                </div>

                {tossWinner && (
                  <div>
                    <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                      Decision *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTossDecision('bat')}
                        className={`p-6 rounded-xl font-semibold text-lg transition-all ${
                          tossDecision === 'bat'
                            ? 'bg-green-600 text-white ring-4 ring-green-100'
                            : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                        }`}
                      >
                        Bat First
                      </button>
                      <button
                        onClick={() => setTossDecision('bowl')}
                        className={`p-6 rounded-xl font-semibold text-lg transition-all ${
                          tossDecision === 'bowl'
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                        }`}
                      >
                        Bowl First
                      </button>
                    </div>
                  </div>
                )}

                {tossWinner && tossDecision && (
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <p className="text-center text-lg font-semibold text-green-800">
                      {tossWinner} won the toss and elected to {tossDecision} first
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Match Settings */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Step 4: Match Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Match Type *</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  >
                    <option value="T20">T20</option>
                    <option value="ODI">ODI</option>
                    <option value="Test">Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Total Overs *</label>
                  <input
                    type="number"
                    value={totalOvers}
                    onChange={(e) => setTotalOvers(e.target.value)}
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Overs Per Bowler *</label>
                  <input
                    type="number"
                    value={oversPerBowler}
                    onChange={(e) => setOversPerBowler(e.target.value)}
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Venue *</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Enter venue name"
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ground *</label>
                  <input
                    type="text"
                    value={ground}
                    onChange={(e) => setGround(e.target.value)}
                    placeholder="Enter ground name"
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Enter country"
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Wagon Wheel</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setWagonWheel(true)}
                      className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                        wagonWheel
                          ? 'bg-green-600 text-white'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      Enabled
                    </button>
                    <button
                      onClick={() => setWagonWheel(false)}
                      className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                        !wagonWheel
                          ? 'bg-red-600 text-white'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Name Display</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setNameDisplay('full')}
                      className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                        nameDisplay === 'full'
                          ? 'bg-[#e60023] text-white'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      Full Name
                    </button>
                    <button
                      onClick={() => setNameDisplay('short')}
                      className={`flex-1 p-3 rounded-lg font-medium transition-all ${
                        nameDisplay === 'short'
                          ? 'bg-[#e60023] text-white'
                          : 'bg-[#f9f9f9] text-[#1a1a1a] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      Short Name
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Match Start */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Step 5: Start Match</h2>

              <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <p className="text-center text-lg font-semibold text-blue-800">
                  {battingTeam} will bat first
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Opening Batsmen - Select Striker *
                  </label>
                  <select
                    value={striker}
                    onChange={(e) => setStriker(e.target.value)}
                    className="w-full p-4 border-2 border-[#e0e0e0] rounded-xl text-lg"
                  >
                    <option value="">Select Striker</option>
                    {battingPlayers.map((player) => (
                      <option key={player} value={player} disabled={player === nonStriker}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Opening Batsmen - Select Non-Striker *
                  </label>
                  <select
                    value={nonStriker}
                    onChange={(e) => setNonStriker(e.target.value)}
                    className="w-full p-4 border-2 border-[#e0e0e0] rounded-xl text-lg"
                  >
                    <option value="">Select Non-Striker</option>
                    {battingPlayers.map((player) => (
                      <option key={player} value={player} disabled={player === striker}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-[#1a1a1a]">
                    Opening Bowler *
                  </label>
                  <select
                    value={openingBowler}
                    onChange={(e) => setOpeningBowler(e.target.value)}
                    className="w-full p-4 border-2 border-[#e0e0e0] rounded-xl text-lg"
                  >
                    <option value="">Select Opening Bowler</option>
                    {bowlingPlayers.map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>

                {striker && nonStriker && openingBowler && (
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <h3 className="font-semibold text-green-800 mb-3 text-center">Match Ready!</h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p><strong>Striker:</strong> {striker}</p>
                      <p><strong>Non-Striker:</strong> {nonStriker}</p>
                      <p><strong>Opening Bowler:</strong> {openingBowler}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-[#666666]">
            Step {currentStep} of {totalSteps}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-3 bg-[#e60023] text-white rounded-xl font-semibold hover:bg-[#cc001e] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {currentStep === totalSteps ? (
              <>
                <Check size={20} />
                Start Match
              </>
            ) : (
              <>
                Next
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
