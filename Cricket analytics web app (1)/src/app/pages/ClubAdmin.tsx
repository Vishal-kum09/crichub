import { useEffect, useState } from 'react';
import { Users, Trophy, Calendar, CheckCircle, XCircle, Trash2, Edit, ArrowRight, ArrowLeft, ShieldCheck, UserPlus, Save, X, Radio } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api'; 
import {
  getPendingApprovals,
  decideApproval,
  toAssignedRole,
  createTournament as apiCreateTournament,
  getRosterMatches,
  getRosterPlayers,
  getRosterScorers,
  getGlobalApprovedClubs,
  createTeam as apiCreateTeam,
  assignScorerToMatch,
  createPlayerDirectByAdmin, 
  type PendingApproval,
  type RosterMatch,
  type RosterMember,
} from '../../lib/adminApi';

export function ClubAdmin() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'my-matches' | 'create-match' | 'create-tournament' | 'roster'>('approvals');
  
  const [rosterView, setRosterView] = useState<'players' | 'scorers'>('players');
  const [matchType, setMatchType] = useState<'club' | 'local'>('club');
  const [wizardStep, setWizardStep] = useState(1);
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '' });

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [myMatches, setMyMatches] = useState<RosterMatch[]>([]);
  const [myPlayers, setMyPlayers] = useState<RosterMember[]>([]);
  const [myScorers, setMyScorers] = useState<RosterMember[]>([]);
  const [globalClubs, setGlobalClubs] = useState<any[]>([]);
  
  const [incomingInvites, setIncomingInvites] = useState<any[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null);
  const [inviteWizardStep, setInviteWizardStep] = useState<number>(1);
  const [inviteSquadIds, setInviteSquadIds] = useState<string[]>([]);
  const [inviteScorerId, setInviteScorerId] = useState<string>('');

  const [assignScorerId, setAssignScorerId] = useState<Record<string, string>>({});
  const [countryCode, setCountryCode] = useState('+91'); 
  
  const [playerForm, setPlayerForm] = useState({ 
    firstName: '', lastName: '', displayName: '', contactNumber: '', gender: 'male',
    jerseyNumber: '', dateOfBirth: '', battingStyle: 'right_hand_bat',
    bowlingStyle: 'right_arm_fast', primaryRole: 'batter', nationality: 'India'
  });

  // 🔥 STRICTLY ALIGNED TO DB MATCHES TABLE
  const [matchForm, setMatchForm] = useState({ 
    date: '', time: '', format: 'T20', ballType: 'leather', oversPerMatch: '20', 
    venue: '', pitchNum: '', venueNeutral: false, city: '', country: 'India',
    opponentClubId: '', selectedSquadIds: [] as string[], assignedScorerId: '' 
  });
  
  const [tournamentForm, setTournamentForm] = useState({ name: '', type: 'League', oversLimit: '20', maxTeams: '8', startDate: '', endDate: '' });

  const loadApprovals = () => {
    getPendingApprovals().then(setPendingApprovals).catch(() => setPendingApprovals([]));
  };

  const loadIncomingInvites = async () => {
    try {
      const response = await api.get('/api/club-admin/matches/incoming');
      setIncomingInvites(response.data || response || []);
    } catch (err) {
      setIncomingInvites([]);
    }
  };

  const loadRosterData = () => {
    getRosterMatches().then(setMyMatches).catch(() => setMyMatches([]));
    getRosterPlayers().then((data: any) => setMyPlayers(data.players || data)).catch(() => setMyPlayers([]));
    getRosterScorers().then(setMyScorers).catch(() => setMyScorers([]));
  };

  useEffect(() => { 
    loadApprovals(); 
    loadIncomingInvites();
  }, []);
  
  useEffect(() => {
    loadRosterData();
    getGlobalApprovedClubs().then((data) => setGlobalClubs(data || [])).catch(() => setGlobalClubs([]));
  }, []);

  const handleApprove = async (id: string) => {
    const approval = pendingApprovals.find(a => a.id === id);
    try {
      await decideApproval(id, 'APPROVE', toAssignedRole(approval?.role || 'player'));
      setPendingApprovals(prev => prev.filter(a => a.id !== id));
      toast.success('Approved successfully!');
      loadRosterData();
    } catch (err: any) {
      toast.error('Failed to approve profile');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await decideApproval(id, 'REJECT');
      setPendingApprovals(prev => prev.filter(a => a.id !== id));
      toast.error('Registration rejected');
    } catch (err: any) {
      toast.error('Failed to reject entry');
    }
  };

  const handleAcceptMatchInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteSquadIds.length === 0) { toast.error("Select squad players for this match."); return; }
    if (!inviteScorerId) { toast.error("Please assign your club scorer."); return; }

    try {
      await api.put(`/api/club-admin/matches/${selectedInvite.matches_id || selectedInvite.id}/accept`, {
        squad_player_ids: inviteSquadIds,
        assigned_scorer_id: inviteScorerId
      });

      toast.success('Match accepted and scheduled live!');
      setSelectedInvite(null);
      setInviteSquadIds([]);
      setInviteScorerId('');
      setInviteWizardStep(1);
      loadIncomingInvites();
      loadRosterData();
    } catch (err: any) {
      toast.error('Failed to accept match challenge');
    }
  };

  const handleToggleInviteSquadMember = (playerId: string) => {
    setInviteSquadIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const handleAddPlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.firstName || !playerForm.contactNumber || !playerForm.displayName) { toast.error("Complete mandatory fields."); return; }
    try {
      const parsedFullContactString = `${countryCode}${playerForm.contactNumber.trim()}`;
      await createPlayerDirectByAdmin({
        first_name: playerForm.firstName, last_name: playerForm.lastName, display_name: playerForm.displayName,
        contact_number: parsedFullContactString, gender: playerForm.gender,
        jersey_number: playerForm.jerseyNumber ? Number(playerForm.jerseyNumber) : undefined,
        date_of_birth: playerForm.dateOfBirth || undefined, batting_style: playerForm.battingStyle,
        bowling_style: playerForm.bowlingStyle || undefined, primary_role: playerForm.primaryRole, nationality: playerForm.nationality
      } as any);

      toast.success(`Player registered!`);
      setPlayerForm({ firstName: '', lastName: '', displayName: '', contactNumber: '', gender: 'male', jerseyNumber: '', dateOfBirth: '', battingStyle: 'right_hand_bat', bowlingStyle: 'right_arm_fast', primaryRole: 'batter', nationality: 'India' });
      setShowAddPlayerForm(false);
      getRosterPlayers().then((data: any) => setMyPlayers(data.players || data)).catch(() => {});
    } catch (err: any) { toast.error('Failed to onboard player'); }
  };

  const handleStartEditPlayer = (player: RosterMember) => {
    setEditingPlayerId(player.id);
    setEditForm({ name: player.name, role: player.role || 'batter' });
  };

  const handleSavePlayerEdit = async (id: string) => {
    try {
      await api.put(`/api/club-admin/players/${id}`, { full_name: editForm.name, primary_role: editForm.role });
      toast.success('Player updated!');
      setEditingPlayerId(null);
      getRosterPlayers().then((data: any) => setMyPlayers(data.players || data)).catch(() => {});
    } catch (err: any) { toast.error('Failed to save edit'); }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Remove player permanently?")) return;
    try {
      await api.delete(`/api/club-admin/players/${id}`);
      toast.error('Player profile removed.');
      getRosterPlayers().then((data: any) => setMyPlayers(data.players || data)).catch(() => {});
    } catch (err: any) { toast.error('Failed to remove player'); }
  };

  const handleToggleSquadMember = (playerId: string) => {
    setMatchForm(prev => {
      const updated = prev.selectedSquadIds.includes(playerId) ? prev.selectedSquadIds.filter(id => id !== playerId) : [...prev.selectedSquadIds, playerId];
      return { ...prev, selectedSquadIds: updated };
    });
  };

  // 🔥 SENDING STRICT DB PAYLOAD
  const handleCreateMatchFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matchForm.selectedSquadIds.length === 0) { toast.error("Select squad players."); return; }
    if (!matchForm.assignedScorerId) { toast.error("Assign a match scorer."); return; }

    try {
      const scheduledAt = matchForm.date ? new Date(`${matchForm.date}T${matchForm.time || '10:00'}:00`).toISOString() : new Date().toISOString();
      await api.post('/api/club-admin/matches', {
        match_type: matchType === 'club' ? 'cross_club' : 'local',
        opponent_club_id: matchType === 'club' ? matchForm.opponentClubId : undefined,
        match_date: matchForm.date,
        start_time: matchForm.time ? `${matchForm.time}:00` : '10:00:00',
        scheduled_at: scheduledAt,
        format: matchForm.format,
        ball_type: matchForm.ballType,
        overs_per_match: Number(matchForm.oversPerMatch) || 20,
        venue: matchForm.venue,
        pitch_num: matchForm.pitchNum ? Number(matchForm.pitchNum) : null,
        venue_neutral: matchForm.venueNeutral,
        city: matchForm.city,
        country: matchForm.country,
        squad_player_ids: matchForm.selectedSquadIds,
        assigned_scorer_id: matchForm.assignedScorerId
      });

      toast.success('Match scheduled successfully!');
      setMatchForm({ date: '', time: '', format: 'T20', ballType: 'leather', oversPerMatch: '20', venue: '', pitchNum: '', venueNeutral: false, city: '', country: 'India', opponentClubId: '', selectedSquadIds: [], assignedScorerId: '' });
      setWizardStep(1);
      setActiveTab('my-matches');
      loadRosterData();
    } catch (err: any) { toast.error('Failed to configure match parameters'); }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const typeMap: Record<string, 'Knockout' | 'League' | 'RoundRobin'> = { League: 'League', Knockout: 'Knockout', 'Round Robin': 'RoundRobin' };
      await api.post('/api/club-admin/tournaments', {
        tournament_name: tournamentForm.name, tournament_type: typeMap[tournamentForm.type] || 'League',
        overs_limit: Number(tournamentForm.oversLimit) || 20, max_teams: Number(tournamentForm.maxTeams) || 8,
        start_date: tournamentForm.startDate || undefined, end_date: tournamentForm.endDate || undefined,
      });
      toast.success('Tournament created successfully!');
    } catch (err: any) { toast.error('Failed to generate tournament'); }
  };

  return (
    <div className="space-y-6 text-black w-full px-2 sm:px-4 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#e60023] to-[#c41e3a] rounded-2xl p-5 md:p-6 text-white shadow-md">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Club Administration Console</h1>
        <p className="text-xs md:text-sm text-white/80 mt-1">Manage operations, approval queries, schedules and player rosters</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <button onClick={() => setActiveTab('approvals')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'approvals' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Users className="mb-1" size={18} /><span>Approval Queue</span></button>
        <button onClick={() => setActiveTab('my-matches')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'my-matches' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Calendar className="mb-1" size={18} /><span>My Matches</span></button>
        <button onClick={() => { setActiveTab('create-match'); setWizardStep(1); }} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'create-match' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Trophy className="mb-1" size={18} /><span>Create Match</span></button>
        <button onClick={() => setActiveTab('create-tournament')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'create-tournament' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Calendar className="mb-1" size={18} /><span>Tournament Wizard</span></button>
        <button onClick={() => { setActiveTab('roster'); setRosterView('players'); }} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'roster' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Users className="mb-1" size={18} /><span>Roster Panel</span></button>
      </div>

      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6 overflow-hidden">
        
        {/* APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 border-b pb-2">Pending Registrations Queue</h2>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-sm font-bold text-gray-400 border border-dashed rounded-xl">All clean! No pending club approvals.</div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((approval) => (
                    <div key={approval.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50/40 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-gray-900">{approval.name}</h3>
                            <span className="px-2 py-0.5 bg-red-50 text-[#e60023] text-[10px] font-black rounded-md border border-red-100 uppercase">{approval.role}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-semibold">Email: <span className="text-gray-700">{approval.email}</span></p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <button onClick={() => handleApprove(approval.id)} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"><CheckCircle size={14} /> Approve</button>
                          <button onClick={() => handleReject(approval.id)} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"><XCircle size={14} /> Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-lg font-black text-gray-900 border-b pb-2 flex items-center gap-2">
                <Radio className="text-[#e60023] animate-pulse" size={18} /> Incoming Cross-Club Match Challenges
              </h2>
              
              {!selectedInvite ? (
                incomingInvites.length === 0 ? (
                  <div className="text-center py-8 text-sm font-bold text-gray-400 border border-dashed rounded-xl">No incoming club match invites right now.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingInvites.map((invite) => (
                      <div key={invite.id} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-black uppercase tracking-wider">{invite.format} • {invite.ball_type}</span>
                            <h3 className="font-black text-sm text-gray-900 mt-1">vs {invite.host_club_name || 'Challenger Club'}</h3>
                          </div>
                          <span className="text-[10px] text-gray-400 font-extrabold">{new Date(invite.match_date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-semibold space-y-0.5">
                          <p>🏟️ <span className="text-gray-700">Venue:</span> {invite.venue}</p>
                          <p>🏏 <span className="text-gray-700">Overs:</span> {invite.overs_per_match} Overs</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedInvite(invite);
                            setInviteSquadIds([]);
                            setInviteScorerId('');
                            setInviteWizardStep(1);
                          }}
                          className="w-full flex items-center justify-center gap-1 py-2 bg-red-50 text-[#e60023] hover:bg-[#e60023] hover:text-white rounded-lg text-xs font-black transition-all border border-red-100"
                        >
                          Review & Accept Match <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="border-2 border-red-100 bg-red-50/10 rounded-xl p-4 space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b pb-2 border-red-100">
                    <div>
                      <h3 className="font-black text-sm text-gray-900">Configuring Challenge Acceptance</h3>
                      <p className="text-[10px] text-gray-400 font-bold">Match against {selectedInvite.host_club_name}</p>
                    </div>
                    <button onClick={() => setSelectedInvite(null)} className="p-1 bg-white text-gray-400 hover:text-gray-600 rounded-full border shadow-sm"><X size={14} /></button>
                  </div>

                  <div className="flex gap-2 text-[10px] font-black">
                    <span className={`px-2 py-0.5 rounded-md ${inviteWizardStep === 1 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>1. CHOOSE SQUAD ({inviteSquadIds.length})</span>
                    <span className={`px-2 py-0.5 rounded-md ${inviteWizardStep === 2 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>2. CHOOSE SCORER</span>
                  </div>

                  {inviteWizardStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 font-bold">Select players from your roster to form the match squad:</p>
                      {myPlayers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-400 font-bold">No players found in your roster.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-xl border border-gray-200">
                          {myPlayers.map((player) => {
                            const isSelected = inviteSquadIds.includes(player.id);
                            return (
                              <div key={player.id} onClick={() => handleToggleInviteSquadMember(player.id)} className={`p-2.5 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-[#e60023] bg-red-50/30 font-extrabold' : 'border-gray-200 hover:bg-gray-50/40'}`}>
                                <div>
                                  <p className="text-xs text-gray-900 font-bold">{player.name}</p>
                                  <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'}</p>
                                </div>
                                <input type="checkbox" checked={isSelected} readOnly className="rounded border-gray-300 accent-[#e60023] h-3.5 w-3.5" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <Button onClick={() => {
                        if (inviteSquadIds.length === 0) { toast.error("Pick at least one squad member."); return; }
                        setInviteWizardStep(2);
                      }} variant="primary" className="w-full flex items-center justify-center gap-1 font-bold text-xs bg-[#e60023] text-white py-2.5 rounded-lg border-none">
                        Proceed to Scorer Assignment <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}

                  {inviteWizardStep === 2 && (
                    <form onSubmit={handleAcceptMatchInviteSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Assign Official Scorer from your Club *</label>
                        <select value={inviteScorerId} onChange={(e) => setInviteScorerId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none" required>
                          <option value="">-- Select Scorer from List --</option>
                          {myScorers.map((scorer) => (
                            <option key={scorer.id} value={scorer.id}>{scorer.name} ({scorer.email})</option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-white border border-gray-200 p-3 rounded-xl text-xs space-y-1 text-gray-500 font-semibold shadow-inner">
                        <h5 className="font-extrabold text-gray-800 flex items-center gap-1 mb-1"><ShieldCheck className="text-green-600" size={14} /> Match Telemetry Handshake</h5>
                        <p>🏟️ <span className="font-extrabold text-gray-700">Venue:</span> {selectedInvite.venue}</p>
                        <p>📅 <span className="font-extrabold text-gray-700">Schedule:</span> {selectedInvite.match_date} @ {selectedInvite.start_time || '10:00 AM'}</p>
                      </div>

                      <div className="flex gap-2 text-xs">
                        <Button type="button" onClick={() => setInviteWizardStep(1)} variant="secondary" className="flex-1 flex items-center justify-center gap-1 font-bold py-2.5 rounded-lg"><ArrowLeft size={14} /> Back</Button>
                        <Button type="submit" variant="primary" className="flex-1 shadow-md bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg border-none">Accept & Live Schedule Match</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY MATCHES */}
        {activeTab === 'my-matches' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 border-b pb-2">All Scheduled Club Fixtures</h2>
            {myMatches.length === 0 ? (
              <div className="text-center py-12 text-sm font-bold text-gray-400">No active matches scheduled.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Opponent Match Vector</th>
                      <th className="py-3 px-4">Scheduled Date</th>
                      <th className="py-3 px-4">Venue Arena</th>
                      <th className="py-3 px-4">Live Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {myMatches.map((match) => (
                      <tr key={match.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="py-3 px-4 font-extrabold text-gray-900">{match.opponent}</td>
                        <td className="py-3 px-4">{new Date(match.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 truncate max-w-[160px]">{match.venue}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${match.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {match.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CREATE MATCH WIZARD */}
        {activeTab === 'create-match' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <h2 className="text-lg font-black text-gray-900">Create Match Configuration</h2>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400">
                <span className={`px-2 py-0.5 rounded-md ${wizardStep === 1 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100'}`}>1. DETAILS</span>
                <span className={`px-2 py-0.5 rounded-md ${wizardStep === 2 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100'}`}>2. SQUAD ({matchForm.selectedSquadIds.length})</span>
                <span className={`px-2 py-0.5 rounded-md ${wizardStep === 3 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100'}`}>3. SCORER</span>
              </div>
            </div>

            {wizardStep === 1 && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                <button type="button" onClick={() => setMatchType('club')} className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition-all ${matchType === 'club' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-700'}`}>Against Another Club</button>
                <button type="button" onClick={() => setMatchType('local')} className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition-all ${matchType === 'local' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-700'}`}>Internal Local Match</button>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                {matchType === 'club' && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Opponent Club *</label>
                    <select value={matchForm.opponentClubId} onChange={(e) => setMatchForm({ ...matchForm, opponentClubId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
                      <option value="">-- Choose Registered Opponent Club --</option>
                      {globalClubs?.map((club: any) => (
                        <option key={club.id} value={club.id}>{club.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ALIGNED TO MATCHES TABLE FIELDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Format *</label>
                    <select value={matchForm.format} onChange={(e) => setMatchForm({ ...matchForm, format: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none">
                      <option value="T20">T20</option>
                      <option value="ODI">ODI (50 Overs)</option>
                      <option value="Test">Test Match</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Ball Type *</label>
                    <select value={matchForm.ballType} onChange={(e) => setMatchForm({ ...matchForm, ballType: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none">
                      <option value="Red Leather Ball">Red Leather Ball</option>
                      <option value="White Leather Ball">White Leather Ball</option>
                      <option value="Pink Leather Ball">Pink Leather Ball</option>
                      <option value="Tennis Ball">Tennis Ball</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Overs Per Match *</label>
                    <Input type="number" placeholder="20" required value={matchForm.oversPerMatch} onChange={(e) => setMatchForm({ ...matchForm, oversPerMatch: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Match Date *</label>
                    <Input type="date" required value={matchForm.date} onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Start Time *</label>
                    <Input type="time" required value={matchForm.time} onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Venue *</label>
                    <Input type="text" placeholder="Ground/Stadium" required value={matchForm.venue} onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">City *</label>
                    <Input type="text" placeholder="Match City" required value={matchForm.city} onChange={(e) => setMatchForm({ ...matchForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Country *</label>
                    <Input type="text" placeholder="Country" required value={matchForm.country} onChange={(e) => setMatchForm({ ...matchForm, country: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Pitch Number</label>
                    <Input type="number" placeholder="e.g. 1" value={matchForm.pitchNum} onChange={(e) => setMatchForm({ ...matchForm, pitchNum: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50 mt-2">
                  <input type="checkbox" id="neutral_venue" checked={matchForm.venueNeutral} onChange={(e) => setMatchForm({ ...matchForm, venueNeutral: e.target.checked })} className="h-4 w-4 accent-[#e60023]" />
                  <label htmlFor="neutral_venue" className="text-xs font-bold text-gray-700 cursor-pointer">Is this a Neutral Venue?</label>
                </div>

                <Button onClick={() => {
                  if (matchType === 'club' && !matchForm.opponentClubId) { toast.error("Choose an opponent club."); return; }
                  if (!matchForm.date || !matchForm.venue || !matchForm.city || !matchForm.country) { toast.error("Complete all required fields."); return; }
                  setWizardStep(2);
                }} variant="primary" className="w-full flex items-center justify-center gap-1 font-bold text-xs py-3 rounded-xl bg-[#e60023] hover:bg-red-700 text-white border-none shadow-sm">
                  Proceed to Squad Selection <ArrowRight size={14} />
                </Button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs text-gray-500 font-semibold">
                  <h4 className="font-extrabold text-gray-900 mb-0.5">Select Playing Squad</h4>
                  <p>Checkmark players assigned to represent the club line-up.</p>
                </div>

                {myPlayers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold">Approved player roster is empty.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                    {myPlayers.map((player) => {
                      const isSelected = matchForm.selectedSquadIds.includes(player.id);
                      return (
                        <div key={player.id} onClick={() => handleToggleSquadMember(player.id)} className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-[#e60023] bg-red-50/30 font-extrabold scale-[0.99]' : 'border-gray-200 hover:bg-gray-50/50'}`}>
                          <div>
                            <p className="text-xs text-gray-900 font-bold">{player.name}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'}</p>
                          </div>
                          <input type="checkbox" checked={isSelected} readOnly className="rounded border-gray-300 accent-[#e60023] h-4 w-4" />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setWizardStep(1)} variant="secondary" className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2.5 rounded-xl"><ArrowLeft size={14} /> Back</Button>
                  <Button onClick={() => {
                    if (matchForm.selectedSquadIds.length === 0) { toast.error("Pick at least one member."); return; }
                    setWizardStep(3);
                  }} variant="primary" className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2.5 rounded-xl bg-[#e60023] text-white border-none">Assign Match Scorer <ArrowRight size={14} /></Button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <form onSubmit={handleCreateMatchFinalSubmission} className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Assign Official Match Scorer *</label>
                  <select value={matchForm.assignedScorerId} onChange={(e) => setMatchForm({ ...matchForm, assignedScorerId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800 focus:outline-none" required>
                    <option value="">-- Choose Registered Scorer from List --</option>
                    {myScorers.map((scorer) => (
                      <option key={scorer.id} value={scorer.id}>{scorer.name} ({scorer.email})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs space-y-1.5 text-gray-500 font-semibold shadow-inner">
                  <h5 className="font-extrabold text-gray-800 flex items-center gap-1 mb-1 text-sm"><ShieldCheck className="text-green-600" size={16} /> Summary Checklist Telemetry</h5>
                  <p>• <span className="font-extrabold text-gray-700">Format Structure:</span> {matchForm.format} Match | <span className="capitalize">{matchForm.ballType}</span> Ball</p>
                  <p>• <span className="font-extrabold text-gray-700">Venue Ground:</span> {matchForm.venue}, {matchForm.city} on {matchForm.date} @ {matchForm.time}</p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={() => setWizardStep(2)} variant="secondary" className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2.5 rounded-xl"><ArrowLeft size={14} /> Back</Button>
                  <Button type="submit" variant="primary" className="flex-1 shadow-md bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl border-none">Schedule Active Match</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* CREATE TOURNAMENT */}
        {activeTab === 'create-tournament' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 border-b pb-2">Create Tournament Profile</h2>
            <form onSubmit={handleCreateTournament} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tournament Name *</label>
                <Input type="text" placeholder="e.g., Summer Cricket Championship" required value={tournamentForm.name} onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tournament Type</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none" value={tournamentForm.type} onChange={(e) => setTournamentForm({ ...tournamentForm, type: e.target.value })} >
                    <option>League</option>
                    <option>Knockout</option>
                    <option>Round Robin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Overs Limit *</label>
                  <Input type="number" placeholder="20" required value={tournamentForm.oversLimit} onChange={(e) => setTournamentForm({ ...tournamentForm, oversLimit: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Maximum Participating Teams *</label>
                <Input type="number" placeholder="8" required value={tournamentForm.maxTeams} onChange={(e) => setTournamentForm({ ...tournamentForm, maxTeams: e.target.value })} />
              </div>
              <Button type="submit" variant="primary" className="w-full bg-[#e60023] hover:bg-red-700 text-white py-2.5 font-bold text-xs rounded-xl border-none">Create Tournament</Button>
            </form>
          </div>
        )}

        {/* ROSTER PANEL */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 py-1">
              <button onClick={() => setRosterView('players')} className={`px-4 py-2 text-xs font-black transition-all relative uppercase ${rosterView === 'players' ? 'text-[#e60023]' : 'text-gray-400 hover:text-gray-800'}`} >Club Players {rosterView === 'players' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />}</button>
              <button onClick={() => setRosterView('scorers')} className={`px-4 py-2 text-xs font-black transition-all relative uppercase ${rosterView === 'scorers' ? 'text-[#e60023]' : 'text-gray-400 hover:text-gray-800'}`} >Club Scorers {rosterView === 'scorers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />}</button>
            </div>

            {/* PLAYERS SUBVIEW */}
            {rosterView === 'players' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl gap-2">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Total Club Registered Players: {myPlayers.length}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Active squad list directly loaded from players table.</p>
                  </div>
                  <Button onClick={() => setShowAddPlayerForm(!showAddPlayerForm)} variant={showAddPlayerForm ? 'secondary' : 'primary'} className="text-[11px] py-1.5 px-3 flex items-center gap-1 font-black bg-[#e60023] text-white rounded-lg shadow-sm border-none">
                    <UserPlus size={14} /> {showAddPlayerForm ? 'Close Form' : 'Add New Player'}
                  </Button>
                </div>

                {showAddPlayerForm && (
                  <form onSubmit={handleAddPlayerSubmit} className="bg-red-50/10 border border-red-100 rounded-2xl p-4 md:p-5 space-y-4 shadow-inner animate-fadeIn">
                    <div className="flex items-center gap-1 text-[#e60023] font-black text-xs border-b pb-2 border-red-100/60 uppercase tracking-wider">
                      <UserPlus size={16} /> Direct Database Player Profile Allocation
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">First Name *</label><Input type="text" placeholder="e.g., Virat" required value={playerForm.firstName} onChange={(e) => setPlayerForm({ ...playerForm, firstName: e.target.value })} /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Last Name</label><Input type="text" placeholder="e.g., Kohli" value={playerForm.lastName} onChange={(e) => setPlayerForm({ ...playerForm, lastName: e.target.value })} /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Display Name *</label><Input type="text" placeholder="e.g., VIRAT" required value={playerForm.displayName} onChange={(e) => setPlayerForm({ ...playerForm, displayName: e.target.value })} /></div>
                      
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Jersey Number</label>
                        <Input type="number" placeholder="e.g., 18" value={playerForm.jerseyNumber} onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })} />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Gender Identity *</label>
                        <select value={playerForm.gender} onChange={(e) => setPlayerForm({ ...playerForm, gender: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800" required>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Date of Birth</label><Input type="date" value={playerForm.dateOfBirth} onChange={(e) => setPlayerForm({ ...playerForm, dateOfBirth: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Batting Style *</label><select value={playerForm.battingStyle} onChange={(e) => setPlayerForm({ ...playerForm, battingStyle: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none" required><option value="right_hand_bat">Right Hand Batsman (RHB)</option><option value="left_hand_bat">Left Hand Batsman (LHB)</option></select></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Bowling Category</label><select value={playerForm.bowlingStyle} onChange={(e) => setPlayerForm({ ...playerForm, bowlingStyle: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none"><option value="right_arm_fast">Right Arm Fast (Pace)</option><option value="right_arm_medium">Right Arm Medium Fast</option><option value="right_arm_spin">Right Arm Spin</option><option value="left_arm_fast">Left Arm Fast (Pace)</option><option value="left_arm_spin">Left Arm Spin</option></select></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Primary Role *</label><select value={playerForm.primaryRole} onChange={(e) => setPlayerForm({ ...playerForm, primaryRole: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none" required><option value="batter">Pure Batsman</option><option value="bowler">Specialist Bowler</option><option value="all_rounder">All-Rounder Combo</option><option value="wicket_keeper">Wicketkeeper Batsman</option></select></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Contact Mobile Number *</label>
                        <div className="flex gap-1 w-full">
                          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="px-2 border border-gray-200 rounded-xl bg-gray-50 text-[11px] font-black focus:outline-none"><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option></select>
                          <div className="flex-1"><Input type="tel" placeholder="Enter mobile number" required value={playerForm.contactNumber} onChange={(e) => setPlayerForm({ ...playerForm, contactNumber: e.target.value })} /></div>
                        </div>
                      </div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nationality</label><Input type="text" placeholder="India" value={playerForm.nationality} onChange={(e) => setPlayerForm({ ...playerForm, nationality: e.target.value })} /></div>
                    </div>
                    <div className="pt-2 flex justify-end gap-2 text-xs">
                      <Button type="button" onClick={() => setShowAddPlayerForm(false)} variant="secondary" className="py-2 px-4 rounded-xl">Cancel</Button>
                      <Button type="submit" variant="primary" className="bg-[#e60023] hover:bg-red-700 text-white font-black py-2 px-6 rounded-xl border-none shadow-sm">Save Profile Card</Button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto border border-gray-100 rounded-xl w-full">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase">
                        <th className="py-3 px-4">Player Name</th>
                        <th className="py-3 px-4">Role Matrix</th>
                        <th className="py-3 px-4 text-center">Contact Info</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                      {myPlayers.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="py-3 px-4">
                            {editingPlayerId === player.id ? (
                              <Input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="max-w-[150px] p-1 text-xs" />
                            ) : (
                              <span className="font-extrabold text-gray-900">{player.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {editingPlayerId === player.id ? (
                              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="border border-gray-300 rounded p-1 text-xs bg-white">
                                <option value="batter">Base Batter</option>
                                <option value="bowler">Specialist Bowler</option>
                                <option value="all_rounder">All Rounder</option>
                                <option value="wicket_keeper">Wicketkeeper</option>
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-[10px] rounded text-gray-600 capitalize">{player.role}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-gray-500">{player.email || '—'}</td>
                          <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-50 text-green-700 border border-green-200">{player.status}</span></td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {editingPlayerId === player.id ? (
                                <>
                                  <button onClick={() => handleSavePlayerEdit(player.id)} className="p-1 text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"><Save size={14} /> Save</button>
                                  <button onClick={() => setEditingPlayerId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleStartEditPlayer(player)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit size={14} /></button>
                                  <button onClick={() => handleDeletePlayer(player.id)} className="p-1 text-gray-400 hover:text-[#e60023] transition-colors"><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rosterView === 'scorers' && (
              <div className="overflow-x-auto border border-gray-100 rounded-xl w-full">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase">
                      <th className="py-3 px-4">Scorer Identity</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {myScorers.map((scorer) => (
                      <tr key={scorer.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="py-3 px-4 font-extrabold text-gray-900">{scorer.name}</td>
                        <td className="py-3 px-4 text-gray-500">{scorer.email}</td>
                        <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-50 text-green-700 border border-green-200">{scorer.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}