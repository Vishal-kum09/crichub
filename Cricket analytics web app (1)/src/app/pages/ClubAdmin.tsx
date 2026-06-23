import { useEffect, useState } from 'react';
import { Users, Trophy, Search, Calendar, CheckCircle, XCircle, Trash2, Edit, ArrowRight, ArrowLeft, ShieldCheck, UserPlus, Save, X, Radio,Clock,MapPin } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api'; 
import {
  getPendingApprovals,
  decideApproval,
  toAssignedRole,
  getRosterMatches,
  getRosterPlayers,
  getRosterScorers,
  getGlobalApprovedClubs,
  getClubTeams,
  createTeam as apiCreateTeam,
  updateClubTeam,
  deleteClubTeam,
  getClubTeamPlayers,
  addPlayerToClubTeam,
  removePlayerFromClubTeam,
  createPlayerDirectByAdmin, 
  type PendingApproval,
  type RosterMatch,
  type RosterMember,
  type ClubTeam,
} from '../../lib/adminApi';

export function ClubAdmin() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'my-matches' | 'create-match' | 'create-tournament' | 'roster'>('approvals');
  
  // 🔥 ADDED NEW STATE VARIABLES FOR MATCH SEARCH & SORT
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [rosterView, setRosterView] = useState<'players' | 'teams' | 'scorers'>('players');
  const [matchType, setMatchType] = useState<'club' | 'local'>('club');
  const [wizardStep, setWizardStep] = useState(1);
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '' });

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [myMatches, setMyMatches] = useState<RosterMatch[]>([]);
  const [myPlayers, setMyPlayers] = useState<RosterMember[]>([]);
  const [myScorers, setMyScorers] = useState<RosterMember[]>([]);
  const [myTeams, setMyTeams] = useState<ClubTeam[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<RosterMember[]>([]);
  const [globalClubs, setGlobalClubs] = useState<any[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamPlayerSearch, setTeamPlayerSearch] = useState('');
  const [matchTeamSearch, setMatchTeamSearch] = useState('');
  const [matchTeamPlayers, setMatchTeamPlayers] = useState<RosterMember[]>([]);
  const [teamForm, setTeamForm] = useState({ name: '', short_name: '', logo_url: '', home_ground: '', country: 'India' });
  
  const [incomingInvites, setIncomingInvites] = useState<any[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null);
  const [inviteWizardStep, setInviteWizardStep] = useState<number>(1);
  const [inviteTeamId, setInviteTeamId] = useState<string>('');
  const [inviteTeamPlayers, setInviteTeamPlayers] = useState<RosterMember[]>([]);
  const [inviteSquadIds, setInviteSquadIds] = useState<string[]>([]);
  const [invitePlayerSearch, setInvitePlayerSearch] = useState('');
  const [inviteCaptainId, setInviteCaptainId] = useState('');
  const [inviteWicketKeeperId, setInviteWicketKeeperId] = useState('');
  const [inviteScorerId, setInviteScorerId] = useState<string>('');

  const [assignScorerId, setAssignScorerId] = useState<Record<string, string>>({});
  const [countryCode, setCountryCode] = useState('+91'); 
  
  const [playerForm, setPlayerForm] = useState({ 
    firstName: '', lastName: '', displayName: '', contactNumber: '', gender: 'male',
    jerseyNumber: '', dateOfBirth: '', battingStyle: 'right_hand_bat',
    bowlingStyle: 'right_arm_fast', primaryRole: 'batter', nationality: 'India'
  });

  const [matchForm, setMatchForm] = useState({ 
    date: '', time: '', format: '', ballType: '', oversPerMatch: '', 
    venue: '', pitchNum: '', venueNeutral: false, city: '', country: '',address:'',postcode:'',
    opponentClubId: '', selectedSquadIds: [] as string[], assignedScorerId: '' 
    , team1Id: '', team2Id: ''
  });
  
  const [tournamentForm, setTournamentForm] = useState({ name: '', type: '', oversLimit: '', maxTeams: '', startDate: '', endDate: '' });

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
    getClubTeams().then(setMyTeams).catch(() => setMyTeams([]));
  };

  const loadTeamPlayers = (teamId: string) => {
    getClubTeamPlayers(teamId).then(setTeamPlayers).catch(() => setTeamPlayers([]));
  };

  const loadMatchTeamPlayers = (teamId: string) => {
    if (!teamId) {
      setMatchTeamPlayers([]);
      setMatchForm(prev => ({ ...prev, selectedSquadIds: [] }));
      return;
    }
    getClubTeamPlayers(teamId)
      .then((players) => {
        setMatchTeamPlayers(players);
        setMatchForm(prev => ({ ...prev, selectedSquadIds: players.map((player) => player.id) }));
      })
      .catch(() => {
        setMatchTeamPlayers([]);
        setMatchForm(prev => ({ ...prev, selectedSquadIds: [] }));
      });
  };

  const loadInviteTeamPlayers = (teamId: string) => {
    setInviteTeamId(teamId);
    setInviteCaptainId('');
    setInviteWicketKeeperId('');
    setInvitePlayerSearch('');
    if (!teamId) {
      setInviteTeamPlayers([]);
      setInviteSquadIds([]);
      return;
    }
    getClubTeamPlayers(teamId)
      .then((players) => {
        setInviteTeamPlayers(players);
        setInviteSquadIds(players.map((player) => player.id));
      })
      .catch(() => {
        setInviteTeamPlayers([]);
        setInviteSquadIds([]);
      });
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
    if (!inviteTeamId) { toast.error("Select your team for this match."); return; }
    if (inviteSquadIds.length === 0) { toast.error("Select squad players for this match."); return; }
    if (!inviteScorerId) { toast.error("Please assign your club scorer."); return; }

    try {
      await api.put(`/api/club-admin/matches/${selectedInvite.matches_id || selectedInvite.id}/accept`, {
        team_id: inviteTeamId,
        squad_player_ids: inviteSquadIds,
        captain_id: inviteCaptainId || null,
        wicketkeeper_id: inviteWicketKeeperId || null,
        assigned_scorer_id: inviteScorerId
      });

      toast.success('Match accepted and scheduled live!');
      setSelectedInvite(null);
      setInviteTeamId('');
      setInviteTeamPlayers([]);
      setInviteSquadIds([]);
      setInvitePlayerSearch('');
      setInviteCaptainId('');
      setInviteWicketKeeperId('');
      setInviteScorerId('');
      setInviteWizardStep(1);
      loadIncomingInvites();
      loadRosterData();
    } catch (err: any) {
      toast.error('Failed to accept match challenge');
    }
  };

  const handleToggleInviteSquadMember = (playerId: string) => {
    setInviteSquadIds(prev => {
      const updated = prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId];
      if (!updated.includes(inviteCaptainId)) setInviteCaptainId('');
      if (!updated.includes(inviteWicketKeeperId)) setInviteWicketKeeperId('');
      return updated;
    });
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

  const resetTeamForm = () => {
    setTeamForm({ name: '', short_name: '', logo_url: '', home_ground: '', country: 'India' });
    setEditingTeamId(null);
    setSelectedTeamId(null);
    setTeamPlayers([]);
    setTeamPlayerSearch('');
  };

  const handleStartCreateTeam = () => {
    resetTeamForm();
    setShowTeamForm(true);
  };

  const handleStartEditTeam = (team: ClubTeam) => {
    setEditingTeamId(team.id);
    setSelectedTeamId(team.id);
    setTeamForm({
      name: team.name || '',
      short_name: team.short_name || '',
      logo_url: team.logo_url || '',
      home_ground: team.home_ground || '',
      country: team.country || 'India'
    });
    setShowTeamForm(true);
    loadTeamPlayers(team.id);
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) { toast.error('Enter team name.'); return; }
    try {
      const payload = {
        name: teamForm.name.trim(),
        short_name: teamForm.short_name.trim() || undefined,
        logo_url: teamForm.logo_url.trim() || undefined,
        home_ground: teamForm.home_ground.trim() || undefined,
        country: teamForm.country.trim() || undefined
      };
      if (editingTeamId) {
        await updateClubTeam(editingTeamId, payload);
        toast.success('Team updated.');
      } else {
        const created = await apiCreateTeam(payload);
        toast.success('Team created.');
        setSelectedTeamId(created.team_id);
        setEditingTeamId(created.team_id);
        loadTeamPlayers(created.team_id);
      }
      getClubTeams().then(setMyTeams).catch(() => {});
    } catch (err: any) {
      toast.error('Failed to save team.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Delete this team? Existing historical records will be preserved.')) return;
    try {
      await deleteClubTeam(teamId);
      toast.success('Team deleted.');
      if (selectedTeamId === teamId) {
        resetTeamForm();
        setShowTeamForm(false);
      }
      getClubTeams().then(setMyTeams).catch(() => {});
    } catch (err: any) {
      toast.error('Failed to delete team.');
    }
  };

  const handleAddTeamPlayer = async (playerId: string) => {
    if (!selectedTeamId) return;
    try {
      await addPlayerToClubTeam(selectedTeamId, playerId);
      toast.success('Player added to team.');
      loadTeamPlayers(selectedTeamId);
      getClubTeams().then(setMyTeams).catch(() => {});
    } catch (err: any) {
      toast.error('Could not add player.');
    }
  };

  const handleRemoveTeamPlayer = async (playerId: string) => {
    if (!selectedTeamId) return;
    try {
      await removePlayerFromClubTeam(selectedTeamId, playerId);
      toast.success('Player removed from team.');
      loadTeamPlayers(selectedTeamId);
      getClubTeams().then(setMyTeams).catch(() => {});
    } catch (err: any) {
      toast.error('Could not remove player.');
    }
  };

  const handleToggleSquadMember = (playerId: string) => {
    setMatchForm(prev => {
      const updated = prev.selectedSquadIds.includes(playerId) ? prev.selectedSquadIds.filter(id => id !== playerId) : [...prev.selectedSquadIds, playerId];
      return { ...prev, selectedSquadIds: updated };
    });
  };

  const handleCreateMatchFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.team1Id) { toast.error("Select your team."); return; }
    if (matchType === 'local' && !matchForm.team2Id) { toast.error("Select the second local team."); return; }
    if (matchForm.selectedSquadIds.length === 0) { toast.error("Selected team has no players."); return; }
    if (!matchForm.assignedScorerId) { toast.error("Assign a match scorer."); return; }

    try {
      const scheduledAt = matchForm.date ? new Date(`${matchForm.date}T${matchForm.time || '10:00'}:00`).toISOString() : new Date().toISOString();
      await api.post('/api/club-admin/matches', {
        match_type: matchType === 'club' ? 'cross_club' : 'local',
        opponent_club_id: matchType === 'club' ? matchForm.opponentClubId : undefined,
        team1_id: matchForm.team1Id,
        team2_id: matchType === 'local' ? matchForm.team2Id : undefined,
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
        address: matchForm.address,
        postcode: matchForm.postcode,
        squad_player_ids: matchForm.selectedSquadIds,
        assigned_scorer_id: matchForm.assignedScorerId
      });

      toast.success('Match scheduled successfully!');
      setMatchForm({ date: '', time: '', format: '', ballType: '', oversPerMatch: '', venue: '', pitchNum: '', venueNeutral: false, city: '', country: '',address:'',postcode:'', opponentClubId: '', selectedSquadIds: [], assignedScorerId: '', team1Id: '', team2Id: '' } as any);
      setMatchTeamPlayers([]);
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

  const teamPlayerIds = new Set(teamPlayers.map((player) => player.id));
  const filteredTeamCandidates = myPlayers.filter((player) => {
    const query = teamPlayerSearch.trim().toLowerCase();
    const matchesSearch = !query || `${player.name} ${player.role}`.toLowerCase().includes(query);
    return matchesSearch && !teamPlayerIds.has(player.id);
  });
  const matchTeamPlayerIds = new Set(matchTeamPlayers.map((player) => player.id));
  const filteredMatchTeamCandidates = myPlayers.filter((player) => {
    const query = matchTeamSearch.trim().toLowerCase();
    const matchesSearch = !query || `${player.name} ${player.role}`.toLowerCase().includes(query);
    return matchesSearch && !matchTeamPlayerIds.has(player.id);
  });
  const inviteSquadSet = new Set(inviteSquadIds);
  const inviteSelectedPlayers = myPlayers.filter((player) => inviteSquadSet.has(player.id));
  const inviteTeamPlayerIds = new Set(inviteTeamPlayers.map((player) => player.id));
  const filteredInviteClubPlayers = myPlayers.filter((player) => {
    const query = invitePlayerSearch.trim().toLowerCase();
    const matchesSearch = !query || `${player.name} ${player.role}`.toLowerCase().includes(query);
    return matchesSearch && !inviteTeamPlayerIds.has(player.id);
  });

  return (
    <div className="space-y-6 text-black w-full px-2 sm:px-4 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#e60023] to-[#c41e3a] rounded-2xl p-5 md:p-6 text-white shadow-md">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Club Administration Console</h1>
        <p className="text-xs md:text-sm text-white/80 mt-1">Manage operations, approval queries, schedules and player rosters</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <button onClick={() => setActiveTab('approvals')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'approvals' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Users className="mb-1" size={18} /><span>Approval Section</span></button>
        <button onClick={() => setActiveTab('my-matches')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'my-matches' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Calendar className="mb-1" size={18} /><span>Scheduled Matches</span></button>
        <button onClick={() => { setActiveTab('create-match'); setWizardStep(1); }} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'create-match' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Trophy className="mb-1" size={18} /><span>Create Match</span></button>
        <button onClick={() => setActiveTab('create-tournament')} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'create-tournament' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Calendar className="mb-1" size={18} /><span>Tournament Wizard</span></button>
        <button onClick={() => { setActiveTab('roster'); setRosterView('players'); }} className={`p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center border transition-all ${activeTab === 'roster' ? 'bg-[#e60023] text-white border-transparent shadow-sm font-black scale-[1.01]' : 'bg-white text-gray-500 border-gray-200'}`}><Users className="mb-1" size={18} /><span>Roster Panel</span></button>
      </div>

      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6 overflow-hidden">
        
        {/* APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 border-b pb-2 flex items-center gap-2">
                <Radio className="text-[#e60023] animate-pulse" size={18} /> Upcoming Matches
              </h2>
              
              {!selectedInvite ? (
                incomingInvites.length === 0 ? (
                  <div className="text-center py-8 text-sm font-bold text-gray-400 border border-dashed rounded-xl">No incoming club match invites right now.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingInvites.map((invite, index) => (
                      <div key={invite.id || invite.matches_id || `invite-${index}`} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50/50 space-y-3">
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
                            setInviteTeamId('');
                            setInviteTeamPlayers([]);
                            setInviteSquadIds([]);
                            setInvitePlayerSearch('');
                            setInviteCaptainId('');
                            setInviteWicketKeeperId('');
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
                    <span className={`px-2 py-0.5 rounded-md ${inviteWizardStep === 1 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>1. SELECT YOUR TEAM ({inviteSquadIds.length})</span>
                    <span className={`px-2 py-0.5 rounded-md ${inviteWizardStep === 2 ? 'bg-[#e60023] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>2. CHOOSE SCORER</span>
                  </div>

                  {inviteWizardStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Select Your Team *</label>
                        <select
                          value={inviteTeamId}
                          onChange={(e) => loadInviteTeamPlayers(e.target.value)}
                          className="w-full px-3 py-2.5 border border-[#e60023] rounded-xl bg-white text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#e60023]"
                        >
                          <option value="">-- Select team from your club --</option>
                          {myTeams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name} ({team.player_count})</option>
                          ))}
                        </select>
                      </div>

                      {inviteTeamId && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <p className="text-xs font-black text-gray-700">Team Players</p>
                              <span className="text-[10px] font-black text-[#e60023]">{inviteSquadIds.length} selected</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto p-2 space-y-2">
                              {inviteTeamPlayers.length === 0 ? (
                                <div className="text-center py-5 text-xs text-gray-400 font-bold">No players listed in this team.</div>
                              ) : inviteTeamPlayers.map((player) => {
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
                          </div>

                          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                              <p className="text-xs font-black text-gray-700 mb-2">Other Club Players</p>
                              <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                                <input
                                  value={invitePlayerSearch}
                                  onChange={(e) => setInvitePlayerSearch(e.target.value)}
                                  placeholder="Search players"
                                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#e60023]"
                                />
                              </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto p-2 space-y-2">
                              {filteredInviteClubPlayers.length === 0 ? (
                                <div className="text-center py-5 text-xs text-gray-400 font-bold">No extra players found.</div>
                              ) : filteredInviteClubPlayers.map((player) => {
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
                          </div>
                        </div>
                      )}

                      {inviteSelectedPlayers.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-1">Captain (Optional)</label>
                            <select value={inviteCaptainId} onChange={(e) => setInviteCaptainId(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                              <option value="">No captain selected</option>
                              {inviteSelectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-1">Wicket Keeper (Optional)</label>
                            <select value={inviteWicketKeeperId} onChange={(e) => setInviteWicketKeeperId(e.target.value)} className="w-full text-xs p-2 border rounded-xl bg-white font-semibold outline-none focus:border-[#e60023]">
                              <option value="">No keeper selected</option>
                              {inviteSelectedPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      <Button onClick={() => {
                        if (!inviteTeamId) { toast.error("Select your team."); return; }
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

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-lg font-black text-gray-900 border-b pb-2">Pending Registration Approval</h2>
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

          </div>
        )}

        {/* 🔥 COMPLETELY UPDATED MY MATCHES SECTION */}
        {activeTab === 'my-matches' && (() => {
          const processedMatches = [...myMatches]
            .filter((match) =>
              match.opponent?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
              if (a.status === 'live' && b.status !== 'live') return -1;
              if (b.status === 'live' && a.status !== 'live') return 1;

              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();

              return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });

          return (
            
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900">All Scheduled Club Fixtures</h2>
                  <p className="text-xs text-gray-500 font-medium">Manage and monitor live and upcoming matches</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[240px]">
                    <input
                      type="text"
                      placeholder="Search by team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Sort Date:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-black text-gray-900 focus:border-gray-900 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="asc">Ascending (Closest)</option>
                      <option value="desc">Descending (Furthest)</option>
                    </select>
                  </div>
                </div>
              </div>

              {processedMatches.length === 0 ? (
                <div className="text-center py-12 text-sm font-bold text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  No matches found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                        <th className="p-4">Date</th>
                        <th className="p-4">Fixture / Teams</th>
                        <th className="p-4">Venue</th>
                        <th className="p-4">Format</th>
                        <th className="p-4">Tournament</th>
                        <th className="p-4 text-right">Status / Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {processedMatches.map((matchItem, index) => {
                        // Bypass TypeScript complaining about DB properties not in RosterMatch interface
                        const match = matchItem as any; 
                        
                        return (
                          <tr 
                            key={match.id || match.matches_id || `match-${index}`} 
                            className={`hover:bg-gray-50/70 transition-colors ${
                              match.status === 'live' ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <td className="p-4 text-sm font-black text-gray-900 tabular-nums">
                              {new Date(match.date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>

                            <td className="p-4">
                              <div className="text-sm font-black text-gray-900">{match.opponent}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Club Match</div>
                            </td>

                            <td className="p-4 text-sm font-bold text-gray-500 max-w-[180px] truncate">
                              {match.venue}
                            </td>

                            <td className="p-4">
                              <span className="inline-block rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-700 uppercase">
                                {match.format }
                              </span>
                            </td>

                            <td className="p-4 text-sm font-black text-gray-700">
                              {match.tournament}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                  match.status === 'scheduled' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : match.status === 'completed' 
                                    ? 'bg-gray-100 text-gray-900 border-gray-300' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                                }`}>
                                  {match.status === 'completed' ? (match.result || 'COMPLETED') : match.status}
                                </span>
                                
                                {match.status === 'live' && match.live_score ? (
                                  <span className="text-sm font-black text-emerald-700 tabular-nums bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                    {match.live_score}
                                  </span>
                                ) : (match.team1_score || match.team2_score) ? (
                                  <span className="text-xs font-bold text-gray-500 tabular-nums">
                                    {match.team1_score || '-'} / {match.team2_score || '-'}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

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
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {matchType === 'club' && (
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase mb-1">Opponent Club *</label>
          <select 
            value={matchForm.opponentClubId} 
            onChange={(e) => setMatchForm({ ...matchForm, opponentClubId: e.target.value })} 
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800 focus:outline-none focus:border-[#e60023]"
          >
            <option value="">-- Choose Registered Opponent Club --</option>
            {globalClubs?.map((club: any) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        </div>
      )}

      {matchType === 'local' && (
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase mb-1">Opponent Team *</label>
          <select
            value={matchForm.team2Id}
            onChange={(e) => setMatchForm({ ...matchForm, team2Id: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-red text-xs font-bold text-gray-800 focus:outline-none focus:border-[#e60023]"
          >
            <option value="">-- Select Team --</option>
            {myTeams.filter(team => team.id !== matchForm.team1Id).map(team => <option key={team.id} value={team.id}>{team.name} ({team.player_count})</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Your Team *</label>
        <select
          value={matchForm.team1Id}
          onChange={(e) => {
            setMatchForm({ ...matchForm, team1Id: e.target.value });
            loadMatchTeamPlayers(e.target.value);
          }}
          className="w-full px-3 py-2.5 border border-[#e60023] rounded-xl bg-white-50/30 text-xs font-bold text-[#e60023] focus:outline-none focus:ring-1 focus:ring-[#e60023]"
        >
          <option value="">-- Select Team --</option>
          {myTeams.map(team => <option key={team.id} value={team.id}>{team.name} ({team.player_count})</option>)}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Format *</label>
        <select value={matchForm.format} onChange={(e) => setMatchForm({ ...matchForm, format: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none focus:border-[#e60023]">
          <option value="T20">T20</option>
          <option value="50 Overs">50 Overs</option>
          <option value="Multi Day">Multi Day</option>
          <option value="National Cup">National Cup(40 Overs)</option>
          <option value="Custom">Custom</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Ball Type *</label>
        <select value={matchForm.ballType} onChange={(e) => setMatchForm({ ...matchForm, ballType: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold focus:outline-none focus:border-[#e60023]">
          <option value="Red Leather Ball">Red Leather Ball</option>
          <option value="White Leather Ball">White Leather Ball</option>
          <option value="Pink Leather Ball">Pink Leather Ball</option>
          <option value="Soft Ball">Soft Ball</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Overs Per Match *</label>
        <Input type="number" placeholder="20" required value={matchForm.oversPerMatch} onChange={(e) => setMatchForm({ ...matchForm, oversPerMatch: e.target.value })} />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Match Date *</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} pointerEvents="none" />
          <input 
            type="date" 
            required 
            value={matchForm.date} 
            onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Start Time *</label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} pointerEvents="none" />
          <input 
            type="time" 
            required 
            value={matchForm.time} 
            onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Venue *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} pointerEvents="none" />
          <input 
            type="text" 
            placeholder="Ground/Stadium" 
            required 
            value={matchForm.venue} 
            onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1 flex items-center gap-1">
          Address <span className="text-gray-400 text-[10px] normal-case">(Optional)</span>
        </label>
        <input 
          type="text" 
          placeholder="e.g. Near Main Gate" 
          value={matchForm.address || ''} 
          onChange={(e) => setMatchForm({ ...matchForm, address: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] placeholder:text-gray-300"
        />
      </div>
    </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1 flex items-center gap-1">City *</label>
        <input 
          type="text" 
          placeholder="Match City" 
          required 
          value={matchForm.city} 
          onChange={(e) => setMatchForm({ ...matchForm, city: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] placeholder:text-gray-300 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Country *</label>
        <input 
          type="text" 
          placeholder="Country" 
          required 
          value={matchForm.country} 
          onChange={(e) => setMatchForm({ ...matchForm, country: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] placeholder:text-gray-300 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">PostCode / ZIP *</label>
        <input 
          type="text" 
          placeholder="PostCode" 
          required 
          value={matchForm.postcode} 
          onChange={(e) => setMatchForm({ ...matchForm, postcode: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] placeholder:text-gray-300 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Pitch Number</label>
        <input 
          type="number" 
          placeholder="e.g. 1" 
          value={matchForm.pitchNum} 
          onChange={(e) => setMatchForm({ ...matchForm, pitchNum: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#e60023] placeholder:text-gray-300 transition-all"
        />
      </div>
    </div>
                <Button onClick={() => {
                  if (!matchForm.team1Id) { toast.error("Choose your team."); return; }
                  if (matchType === 'local' && !matchForm.team2Id) { toast.error("Choose opponent team."); return; }
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
                  <h4 className="font-extrabold text-gray-900 mb-0.5">Team Members</h4>
                  <p>Players are loaded from the selected team. Add extra club players here when the squad changes.</p>
                </div>
                {matchTeamPlayers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold">Selected team has no players yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                    {matchTeamPlayers.map((player) => (
                      <div key={player.id} className="p-3 border rounded-xl flex items-center justify-between bg-white border-gray-200">
                        <div>
                          <p className="text-xs text-gray-900 font-bold">{player.name}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'} | Below 18: {player.below_18 ? 'Yes' : 'No'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!matchForm.team1Id) return;
                            removePlayerFromClubTeam(matchForm.team1Id, player.id)
                              .then(() => loadMatchTeamPlayers(matchForm.team1Id))
                              .catch(() => toast.error('Could not remove player from team.'));
                          }}
                          className="p-1 text-gray-400 hover:text-[#e60023]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
                    <h5 className="text-xs font-black text-gray-900">Add Other Club Player</h5>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                      <Input type="text" value={matchTeamSearch} onChange={(e) => setMatchTeamSearch(e.target.value)} placeholder="Search players..." className="pl-8 text-xs" />
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {filteredMatchTeamCandidates.length === 0 ? (
                      <div className="p-4 text-xs text-gray-400 font-bold text-center">No matching players available.</div>
                    ) : filteredMatchTeamCandidates.map((player) => (
                      <div key={player.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                        <div>
                          <p className="text-xs font-extrabold text-gray-900">{player.name}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'} | Below 18: {player.below_18 ? 'Yes' : 'No'}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!matchForm.team1Id) { toast.error('Select team first.'); return; }
                            addPlayerToClubTeam(matchForm.team1Id, player.id)
                              .then(() => loadMatchTeamPlayers(matchForm.team1Id))
                              .catch(() => toast.error('Could not add player to team.'));
                          }}
                          variant="secondary"
                          className="text-[10px] py-1 px-2 rounded-lg font-black"
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setWizardStep(1)} variant="secondary" className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2.5 rounded-xl"><ArrowLeft size={14} /> Back</Button>
                  <Button onClick={() => {
                    if (matchForm.selectedSquadIds.length === 0) { toast.error("Selected team has no players."); return; }
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
              <button onClick={() => setRosterView('teams')} className={`px-4 py-2 text-xs font-black transition-all relative uppercase ${rosterView === 'teams' ? 'text-[#e60023]' : 'text-gray-400 hover:text-gray-800'}`} >Club Teams {rosterView === 'teams' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />}</button>
              <button onClick={() => setRosterView('scorers')} className={`px-4 py-2 text-xs font-black transition-all relative uppercase ${rosterView === 'scorers' ? 'text-[#e60023]' : 'text-gray-400 hover:text-gray-800'}`} >Club Officials {rosterView === 'scorers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />}</button>
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
            
            {/* TEAMS SUBVIEW */}
            {rosterView === 'teams' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl gap-2">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Total Club Teams: {myTeams.length}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">Teams are created for your club and linked through the club admin account.</p>
                  </div>
                  <Button onClick={handleStartCreateTeam} variant="primary" className="text-[11px] py-1.5 px-3 flex items-center gap-1 font-black bg-[#e60023] text-white rounded-lg shadow-sm border-none">
                    <Trophy size={14} /> Create Team
                  </Button>
                </div>
                {showTeamForm && (
                  <form onSubmit={handleTeamSubmit} className="bg-red-50/10 border border-red-100 rounded-2xl p-4 md:p-5 space-y-4 shadow-inner animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 border-b pb-2 border-red-100/60">
                      <div className="flex items-center gap-1 text-[#e60023] font-black text-xs uppercase tracking-wider">
                        <Trophy size={16} /> {editingTeamId ? 'Edit Club Team' : 'Create Club Team'}
                      </div>
                      <button type="button" onClick={() => { resetTeamForm(); setShowTeamForm(false); }} className="p-1 text-gray-400 hover:text-gray-700"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Name *</label><Input type="text" required value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="e.g., Lions XI" /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Short Name</label><Input type="text" value={teamForm.short_name} onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value })} placeholder="LXI" /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Logo URL</label><Input type="url" value={teamForm.logo_url} onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })} placeholder="https://..." /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Home Ground</label><Input type="text" value={teamForm.home_ground} onChange={(e) => setTeamForm({ ...teamForm, home_ground: e.target.value })} placeholder="Main Oval" /></div>
                      <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Country</label><Input type="text" value={teamForm.country} onChange={(e) => setTeamForm({ ...teamForm, country: e.target.value })} placeholder="India" /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="submit" variant="primary" className="bg-[#e60023] hover:bg-red-700 text-white font-black py-2 px-6 rounded-xl border-none shadow-sm">
                        <Save size={14} /> {editingTeamId ? 'Save Team' : 'Submit Team'}
                      </Button>
                    </div>
                    {editingTeamId && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                        <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                            <h5 className="text-xs font-black text-gray-900">Players in Team: {teamPlayers.length}</h5>
                          </div>
                          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                            {teamPlayers.length === 0 ? (
                              <div className="p-4 text-xs text-gray-400 font-bold text-center">No players added yet.</div>
                            ) : teamPlayers.map((player) => (
                              <div key={player.id} className="p-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-extrabold text-gray-900">{player.name}</p>
                                  <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'} | Below 18: {player.below_18 ? 'Yes' : 'No'}</p>
                                </div>
                                <button type="button" onClick={() => handleRemoveTeamPlayer(player.id)} className="p-1 text-gray-400 hover:text-[#e60023]"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
                          <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
                            <h5 className="text-xs font-black text-gray-900">Add Player</h5>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                              <Input type="text" value={teamPlayerSearch} onChange={(e) => setTeamPlayerSearch(e.target.value)} placeholder="Search club players..." className="pl-8 text-xs" />
                            </div>
                          </div>
                          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                            {filteredTeamCandidates.length === 0 ? (
                              <div className="p-4 text-xs text-gray-400 font-bold text-center">No matching club players available.</div>
                            ) : filteredTeamCandidates.map((player) => (
                              <div key={player.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                                <div>
                                  <p className="text-xs font-extrabold text-gray-900">{player.name}</p>
                                  <p className="text-[10px] text-gray-400 capitalize">{player.role || 'Player'} | Below 18: {player.below_18 ? 'Yes' : 'No'}</p>
                                </div>
                                <Button type="button" onClick={() => handleAddTeamPlayer(player.id)} variant="secondary" className="text-[10px] py-1 px-2 rounded-lg font-black">Add</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                )}
                <div className="overflow-x-auto border border-gray-100 rounded-xl w-full">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase">
                        <th className="py-3 px-4">Team Name</th>
                        <th className="py-3 px-4">Short Name</th>
                        <th className="py-3 px-4">Home Ground</th>
                        <th className="py-3 px-4 text-center">Country</th>
                        <th className="py-3 px-4 text-center">Players</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                      {myTeams.map((team) => (
                        <tr key={team.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-gray-900">{team.name}</td>
                          <td className="py-3 px-4">{team.short_name}</td>
                          <td className="py-3 px-4 text-gray-500">{team.home_ground || '-'}</td>
                          <td className="py-3 px-4 text-center text-gray-500">{team.country || '-'}</td>
                          <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-gray-50 text-gray-600 border border-gray-200">{team.player_count}</span></td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleStartEditTeam(team)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteTeam(team.id)} className="p-1 text-gray-400 hover:text-[#e60023] transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* SCORERS SUBVIEW */}
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
  );}
