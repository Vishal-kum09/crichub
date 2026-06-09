import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { mockTeams, mockPlayers, mockMatches } from '../../data/mockData';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';

interface AdminProps {
  onNavigate: (path: string) => void;
}

export function Admin({ onNavigate }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'matches' | 'scorers' | 'venues'>('teams');
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'teams', label: 'Manage Teams' },
    { id: 'players', label: 'Manage Players' },
    { id: 'matches', label: 'Manage Matches' },
    { id: 'scorers', label: 'Assign Scorers' },
    { id: 'venues', label: 'Venue Analytics' },
  ] as const;

  const openDrawer = (mode: 'create' | 'edit') => {
    setDrawerMode(mode);
    setShowDrawer(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    // Validation
    const requiredFields = activeTab === 'teams'
      ? ['name', 'competition', 'coach', 'homeGround']
      : activeTab === 'players'
      ? ['name', 'team', 'role', 'battingStyle', 'bowlingStyle']
      : ['teamA', 'teamB', 'date', 'venue', 'format'];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields`);
      return;
    }

    toast.success(`${drawerMode === 'create' ? 'Created' : 'Updated'} ${activeTab.slice(0, -1)} successfully!`);
    setShowDrawer(false);
  };

  const handleDelete = (itemType: string, itemName: string) => {
    if (window.confirm(`Are you sure you want to delete ${itemName}?`)) {
      toast.success(`Deleted ${itemName} successfully!`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Administration</h2>
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-[#e0e0e0]">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 relative transition-colors ${
                activeTab === tab.id ? 'text-[#e60023] font-medium' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Management */}
      {activeTab === 'teams' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Teams</h3>
            <Button variant="primary" onClick={() => openDrawer('create')}>
              <Plus size={16} className="inline mr-2" />
              Add Team
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Competition</th>
                  <th className="pb-3 tabular-nums">Players</th>
                  <th className="pb-3 tabular-nums">Matches</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockTeams.map((team) => (
                  <tr key={team.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="py-4 font-medium">{team.name}</td>
                    <td className="py-4 text-sm">{team.competition}</td>
                    <td className="py-4 tabular-nums">{team.playerCount}</td>
                    <td className="py-4 tabular-nums">{team.matchCount}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDrawer('edit')}
                          className="p-2 text-[#e60023] hover:bg-[#e60023]/5 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-[#b30000] hover:bg-[#b30000]/5 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Players Management */}
      {activeTab === 'players' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Players</h3>
            <div className="flex gap-3">
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button variant="primary" onClick={() => openDrawer('create')}>
                <Plus size={16} className="inline mr-2" />
                Add Player
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 tabular-nums">Matches</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockPlayers
                  .filter(player =>
                    searchQuery === '' ||
                    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    player.team.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((player) => (
                  <tr key={player.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="py-4 font-medium">{player.name}</td>
                    <td className="py-4 text-sm">{player.team}</td>
                    <td className="py-4">
                      <Badge variant="role">{player.role}</Badge>
                    </td>
                    <td className="py-4 tabular-nums">{player.matches}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDrawer('edit')}
                          className="p-2 text-[#e60023] hover:bg-[#e60023]/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete('player', player.name)}
                          className="p-2 text-[#b30000] hover:bg-[#b30000]/5 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Matches Management */}
      {activeTab === 'matches' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Matches</h3>
            <Button variant="primary" onClick={() => openDrawer('create')}>
              <Plus size={16} className="inline mr-2" />
              Add Match
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Teams</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Venue</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockMatches.map((match) => (
                  <tr key={match.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="py-4 font-medium">
                      {match.teamA} vs {match.teamB}
                    </td>
                    <td className="py-4 text-sm">{new Date(match.date).toLocaleDateString()}</td>
                    <td className="py-4 text-sm">{match.venue}</td>
                    <td className="py-4">
                      <Badge variant={match.status === 'Won' ? 'won' : match.status === 'Lost' ? 'lost' : 'scheduled'}>
                        {match.status}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDrawer('edit')}
                          className="p-2 text-[#e60023] hover:bg-[#e60023]/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete('match', `${match.teamA} vs ${match.teamB}`)}
                          className="p-2 text-[#b30000] hover:bg-[#b30000]/5 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assign Scorers Tab */}
      {activeTab === 'scorers' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Assign Scorers to Matches</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Match</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Venue</th>
                  <th className="pb-3">Assigned Scorer</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockMatches.slice(0, 8).map((match) => (
                  <tr key={match.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="py-4 font-medium">
                      {match.teamA} vs {match.teamB}
                    </td>
                    <td className="py-4 text-sm">{new Date(match.date).toLocaleDateString()}</td>
                    <td className="py-4 text-sm">{match.venue}</td>
                    <td className="py-4">
                      <select className="px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm">
                        <option value="">Select Scorer</option>
                        <option value="scorer1">John Doe</option>
                        <option value="scorer2">Jane Smith</option>
                        <option value="scorer3">Mike Johnson</option>
                        <option value="scorer4">Sarah Williams</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => toast.success('Scorer assigned successfully!')}
                        className="px-4 py-2 bg-[#e60023] text-white rounded-lg text-sm hover:bg-[#cc001e] transition-colors"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Scorer Management</h4>
            <p className="text-sm text-blue-700 mb-3">
              Assign official scorers to matches. Scorers will receive access to the Scorer Console for their assigned matches.
            </p>
            <button
              onClick={() => toast.info('Scorer management features coming soon')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              + Add New Scorer
            </button>
          </div>
        </Card>
      )}

      {/* Venue Analytics Tab */}
      {activeTab === 'venues' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Venue Analytics Dashboard</h3>
              <button
                onClick={() => onNavigate('/analytics')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                📊 View Full Analytics
              </button>
            </div>

            {/* Venue Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[
                { venue: 'Wankhede Stadium', matches: 42, avgScore: 178 },
                { venue: 'M. Chinnaswamy Stadium', matches: 38, avgScore: 185 },
                { venue: 'Eden Gardens', matches: 45, avgScore: 172 },
              ].map((venue, index) => (
                <div key={index} className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-lg mb-3">{venue.venue}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#666666]">Matches Played</span>
                      <span className="font-bold text-blue-600">{venue.matches}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#666666]">Avg 1st Inns Score</span>
                      <span className="font-bold text-purple-600">{venue.avgScore}</span>
                    </div>
                    <button
                      onClick={() => toast.info(`Detailed analytics for ${venue.venue}`)}
                      className="w-full mt-3 px-3 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors border border-blue-200"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Team Performance at Venues */}
            <h4 className="font-semibold text-lg mb-4">Team Performance by Venue</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Venue</th>
                    <th className="pb-3 tabular-nums">Matches</th>
                    <th className="pb-3 tabular-nums">Won</th>
                    <th className="pb-3 tabular-nums">Lost</th>
                    <th className="pb-3 tabular-nums">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { team: 'Mumbai Indians', venue: 'Wankhede Stadium', matches: 25, won: 18, lost: 7, winPct: 72 },
                    { team: 'Chennai Super Kings', venue: 'M. A. Chidambaram', matches: 28, won: 20, lost: 8, winPct: 71.4 },
                    { team: 'Royal Challengers', venue: 'M. Chinnaswamy', matches: 22, won: 15, lost: 7, winPct: 68.2 },
                    { team: 'Kolkata Knight Riders', venue: 'Eden Gardens', matches: 26, won: 17, lost: 9, winPct: 65.4 },
                  ].map((stat, index) => (
                    <tr key={index} className="border-b border-[#f0f0f0] last:border-0">
                      <td className="py-3 font-medium">{stat.team}</td>
                      <td className="py-3 text-sm">{stat.venue}</td>
                      <td className="py-3 tabular-nums">{stat.matches}</td>
                      <td className="py-3 tabular-nums text-green-600 font-semibold">{stat.won}</td>
                      <td className="py-3 tabular-nums text-red-600">{stat.lost}</td>
                      <td className="py-3 tabular-nums font-bold">{stat.winPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Team Last Matches Analysis */}
          <Card>
            <h3 className="text-xl font-semibold mb-6">Team Last 5 Matches Analysis</h3>
            <div className="space-y-6">
              {mockTeams.slice(0, 3).map((team) => (
                <div key={team.id} className="p-6 bg-[#f9f9f9] rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">{team.name}</h4>
                    <div className="flex gap-1">
                      {['W', 'L', 'W', 'W', 'L'].map((result, i) => (
                        <span
                          key={i}
                          className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${
                            result === 'W' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-[#666666] mb-1">Win Rate</p>
                      <p className="text-2xl font-bold text-green-600">60%</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-[#666666] mb-1">Avg Score</p>
                      <p className="text-2xl font-bold">182</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-[#666666] mb-1">Top Scorer</p>
                      <p className="text-sm font-semibold">V. Kohli</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-[#666666] mb-1">Top Bowler</p>
                      <p className="text-sm font-semibold">J. Bumrah</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('/team', team.id)}
                    className="w-full mt-4 px-4 py-2 bg-[#e60023] text-white rounded-lg font-medium hover:bg-[#cc001e] transition-colors"
                  >
                    View Full Team Stats →
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Drawer/Modal for Create/Edit */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white z-50 p-4 lg:p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-semibold">
                  {drawerMode === 'create' ? 'Create' : 'Edit'} {activeTab.slice(0, -1)}
                </h3>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-[#666666] hover:text-[#1a1a1a] text-2xl p-2"
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Team Form */}
                {activeTab === 'teams' && (
                  <>
                    <div>
                      <label className="block text-sm mb-2">Team Name *</label>
                      <Input name="name" placeholder="Enter team name" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Competition *</label>
                      <Input name="competition" placeholder="IPL, BBL, etc." required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Coach *</label>
                      <Input name="coach" placeholder="Enter coach name" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Home Ground *</label>
                      <Input name="homeGround" placeholder="Enter home ground" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Founded Year</label>
                      <Input name="founded" type="number" placeholder="2008" />
                    </div>
                  </>
                )}

                {/* Player Form */}
                {activeTab === 'players' && (
                  <>
                    <div>
                      <label className="block text-sm mb-2">Player Name *</label>
                      <Input name="name" placeholder="Enter player name" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Team *</label>
                      <select
                        name="team"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select team</option>
                        {mockTeams.map((team) => (
                          <option key={team.id} value={team.name}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Role *</label>
                      <select
                        name="role"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select role</option>
                        <option value="Batsman">Batsman</option>
                        <option value="Bowler">Bowler</option>
                        <option value="All-rounder">All-rounder</option>
                        <option value="Wicket-keeper">Wicket-keeper</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Batting Style *</label>
                      <select
                        name="battingStyle"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select style</option>
                        <option value="Right-hand bat">Right-hand bat</option>
                        <option value="Left-hand bat">Left-hand bat</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Bowling Style *</label>
                      <select
                        name="bowlingStyle"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select style</option>
                        <option value="Right-arm fast">Right-arm fast</option>
                        <option value="Left-arm fast">Left-arm fast</option>
                        <option value="Right-arm medium">Right-arm medium</option>
                        <option value="Left-arm medium">Left-arm medium</option>
                        <option value="Right-arm spin">Right-arm spin</option>
                        <option value="Left-arm spin">Left-arm spin</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Jersey Number</label>
                      <Input name="jerseyNumber" type="number" placeholder="7" min="1" max="99" />
                    </div>
                  </>
                )}

                {/* Match Form */}
                {activeTab === 'matches' && (
                  <>
                    <div>
                      <label className="block text-sm mb-2">Team A *</label>
                      <select
                        name="teamA"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select team</option>
                        {mockTeams.map((team) => (
                          <option key={team.id} value={team.name}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Team B *</label>
                      <select
                        name="teamB"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select team</option>
                        {mockTeams.map((team) => (
                          <option key={team.id} value={team.name}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Date & Time *</label>
                      <Input name="date" type="datetime-local" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Venue *</label>
                      <Input name="venue" placeholder="Enter venue" required />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Format *</label>
                      <select
                        name="format"
                        required
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
                      >
                        <option value="">Select format</option>
                        <option value="T20">T20</option>
                        <option value="ODI">ODI</option>
                        <option value="Test">Test</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Overs</label>
                      <Input name="overs" type="number" placeholder="20" min="1" />
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e0e0e0]">
                  <Button type="submit" variant="primary" className="flex-1">
                    {drawerMode === 'create' ? 'Create' : 'Update'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowDrawer(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
