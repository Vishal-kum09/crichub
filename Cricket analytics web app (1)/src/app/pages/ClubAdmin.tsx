import { useState } from 'react';
import { Users, Trophy, Calendar, CheckCircle, XCircle, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';

export function ClubAdmin() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'create-match' | 'create-tournament' | 'roster'>('approvals');
  const [rosterView, setRosterView] = useState<'matches' | 'players' | 'scorers'>('matches');
  const [matchType, setMatchType] = useState<'club' | 'local'>('club');

  // Mock data for approval queue
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: '1', name: 'Rohit Sharma', email: 'rohit@example.com', phone: '+91-9876543210', role: 'player', date: '2024-01-15' },
    { id: '2', name: 'Virat Kohli', email: 'virat@example.com', phone: '+91-9876543211', role: 'player', date: '2024-01-16' },
    { id: '3', name: 'John Scorer', email: 'john@example.com', phone: '+91-9876543212', role: 'scorer', date: '2024-01-17' },
    { id: '4', name: 'Sarah Analyst', email: 'sarah@example.com', phone: '+91-9876543213', role: 'analyst', date: '2024-01-18' },
  ]);

  // Mock roster data
  const myMatches = [
    { id: '1', opponent: 'Chennai Super Kings Academy', date: '2024-02-15', venue: 'Wankhede Stadium', status: 'Scheduled' },
    { id: '2', opponent: 'Royal Challengers Academy', date: '2024-02-10', venue: 'M. Chinnaswamy Stadium', status: 'Completed' },
  ];

  const myPlayers = [
    { id: '1', name: 'Rohit Sharma', role: 'Batsman', matches: 45, avgRuns: 52.3, status: 'Active' },
    { id: '2', name: 'Jasprit Bumrah', role: 'Bowler', matches: 42, avgWickets: 2.1, status: 'Active' },
    { id: '3', name: 'Hardik Pandya', role: 'All-Rounder', matches: 38, avgRuns: 35.2, status: 'Active' },
  ];

  const myScorers = [
    { id: '1', name: 'John Scorer', email: 'john@example.com', matchesScored: 28, status: 'Active' },
    { id: '2', name: 'Emily Smith', email: 'emily@example.com', matchesScored: 15, status: 'Active' },
  ];

  const handleApprove = (id: string) => {
    const approval = pendingApprovals.find(a => a.id === id);
    setPendingApprovals(pendingApprovals.filter(a => a.id !== id));
    toast.success(`${approval?.name} approved as ${approval?.role}!`);
  };

  const handleReject = (id: string) => {
    const approval = pendingApprovals.find(a => a.id === id);
    setPendingApprovals(pendingApprovals.filter(a => a.id !== id));
    toast.error(`${approval?.name}'s registration rejected`);
  };

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(matchType === 'club' ? 'Match request sent to opponent club!' : 'Local match created successfully!');
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Tournament created successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e60023] to-[#c41e3a] rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Club Administration</h1>
        <p className="text-white/90">Manage your club operations, approvals, and roster</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'approvals'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          <Users className="mx-auto mb-2" size={24} />
          Approval Queue
        </button>
        <button
          onClick={() => setActiveTab('create-match')}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'create-match'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          <Trophy className="mx-auto mb-2" size={24} />
          Create Match
        </button>
        <button
          onClick={() => setActiveTab('create-tournament')}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'create-tournament'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          <Calendar className="mx-auto mb-2" size={24} />
          Create Tournament
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'roster'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          <Users className="mx-auto mb-2" size={24} />
          Roster Management
        </button>
      </div>

      {/* Approval Queue Tab */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Pending Registrations</h2>
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto mb-4 text-[#e0e0e0]" size={48} />
              <p className="text-[#666666]">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border border-[#e0e0e0] rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[#1a1a1a]">{approval.name}</h3>
                        <span className="px-2 py-1 bg-[#e60023]/10 text-[#e60023] text-xs font-semibold rounded">
                          {approval.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-[#666666] space-y-1">
                        <p>Email: {approval.email}</p>
                        <p>Phone: {approval.phone}</p>
                        <p>Applied: {new Date(approval.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Match Tab */}
      {activeTab === 'create-match' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Create Match</h2>

          {/* Match Type Selection */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setMatchType('club')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                matchType === 'club'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-[#f5f5f5] text-[#666666] hover:bg-[#e0e0e0]'
              }`}
            >
              Against Another Club
            </button>
            <button
              onClick={() => setMatchType('local')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                matchType === 'local'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-[#f5f5f5] text-[#666666] hover:bg-[#e0e0e0]'
              }`}
            >
              Local Match
            </button>
          </div>

          <form onSubmit={handleCreateMatch} className="space-y-4">
            {matchType === 'club' && (
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">Opponent Club</label>
                <select className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]">
                  <option>Chennai Super Kings Academy</option>
                  <option>Royal Challengers Academy</option>
                  <option>Kolkata Knight Riders Academy</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Match Date</label>
              <Input type="date" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Match Time</label>
              <Input type="time" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Venue</label>
              <Input type="text" placeholder="Enter venue name" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Match Type</label>
              <select className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]">
                <option>T20</option>
                <option>50 Overs</option>
                <option>Practice Match</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Total Overs</label>
              <Input type="number" placeholder="20" required />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              {matchType === 'club' ? 'Send Match Request' : 'Create Local Match'}
            </Button>
          </form>
        </div>
      )}

      {/* Create Tournament Tab */}
      {activeTab === 'create-tournament' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Create Tournament</h2>

          <form onSubmit={handleCreateTournament} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Tournament Name</label>
              <Input type="text" placeholder="e.g., Summer Cricket Championship" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Tournament Type</label>
              <select className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]">
                <option>League</option>
                <option>Knockout</option>
                <option>Round Robin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Overs Limit</label>
              <Input type="number" placeholder="20" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Total Number of Matches</label>
              <Input type="number" placeholder="10" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Maximum Participating Teams</label>
              <Input type="number" placeholder="8" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">Start Date</label>
              <Input type="date" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">End Date</label>
              <Input type="date" required />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Create Tournament
            </Button>
          </form>
        </div>
      )}

      {/* Roster Management Tab */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Roster Management</h2>

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#e0e0e0]">
            <button
              onClick={() => setRosterView('matches')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                rosterView === 'matches' ? 'text-[#e60023]' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              My Matches
              {rosterView === 'matches' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
            <button
              onClick={() => setRosterView('players')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                rosterView === 'players' ? 'text-[#e60023]' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              My Players
              {rosterView === 'players' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
            <button
              onClick={() => setRosterView('scorers')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                rosterView === 'scorers' ? 'text-[#e60023]' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              My Scorers
              {rosterView === 'scorers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
          </div>

          {/* My Matches */}
          {rosterView === 'matches' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Opponent</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Venue</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myMatches.map((match) => (
                    <tr key={match.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{match.opponent}</td>
                      <td className="py-3 px-4 text-[#666666]">{new Date(match.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-[#666666]">{match.venue}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          match.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-[#e60023] hover:underline text-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* My Players */}
          {rosterView === 'players' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Player Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Role</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Matches</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Performance</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myPlayers.map((player) => (
                    <tr key={player.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{player.name}</td>
                      <td className="py-3 px-4 text-[#666666]">{player.role}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{player.matches}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">
                        {player.avgRuns ? `${player.avgRuns} avg` : `${player.avgWickets} wkts`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          {player.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button className="p-1 text-[#666666] hover:text-[#e60023]">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-[#666666] hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* My Scorers */}
          {rosterView === 'scorers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Scorer Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Email</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Matches Scored</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myScorers.map((scorer) => (
                    <tr key={scorer.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{scorer.name}</td>
                      <td className="py-3 px-4 text-[#666666]">{scorer.email}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{scorer.matchesScored}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          {scorer.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button className="p-1 text-[#666666] hover:text-[#e60023]">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-[#666666] hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
