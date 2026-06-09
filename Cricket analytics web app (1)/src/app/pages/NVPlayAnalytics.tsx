import { useState } from 'react';
import { ArrowLeft, BarChart3, Users, Trophy, Sparkles, ChevronDown, Calendar, Send, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface NVPlayAnalyticsProps {
  onNavigate?: (path: string) => void;
}

export function NVPlayAnalytics({ onNavigate }: NVPlayAnalyticsProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<string>('');

  // Global filters state
  const [globalFilters, setGlobalFilters] = useState({
    tournament: [] as string[],
    homeTeam: [] as string[],
    homeAway: [] as string[],
    matchType: [] as string[],
    tossResult: [] as string[],
    batFieldFirst: [] as string[],
  });

  // If no dashboard selected, show home page
  if (!selectedDashboard) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 mt-8">
            <h1 className="text-4xl font-bold text-[#1a1a1a] mb-3">NV Play Analytics</h1>
            <p className="text-[#666666] text-lg">Choose a dashboard to explore your data</p>
          </div>

          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Team Performance */}
            <button
              onClick={() => {
                setSelectedDashboard('team');
                setSelectedSubTab('innings');
              }}
              className="bg-white rounded-2xl p-8 text-left hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#e60023]/20 transition-colors">
                <BarChart3 size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">Team Performance</h3>
              <p className="text-[#666666] leading-relaxed">
                Analyze innings progression, bowling control, and match impact strategies
              </p>
            </button>

            {/* Player Performance */}
            <button
              onClick={() => {
                setSelectedDashboard('player');
                setSelectedSubTab('batting');
              }}
              className="bg-white rounded-2xl p-8 text-left hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#e60023]/20 transition-colors">
                <Users size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">Player Performance</h3>
              <p className="text-[#666666] leading-relaxed">
                Deep dive into batting execution, bowling execution, and player matchups
              </p>
            </button>

            {/* Tournament Performance */}
            <button
              onClick={() => {
                setSelectedDashboard('tournament');
                setSelectedSubTab('standings');
              }}
              className="bg-white rounded-2xl p-8 text-left hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#e60023]/20 transition-colors">
                <Trophy size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">Tournament Performance</h3>
              <p className="text-[#666666] leading-relaxed">
                View standings, top performers, and venue conditions across tournaments
              </p>
            </button>

            {/* AI Custom Analytics */}
            <button
              onClick={() => {
                setSelectedDashboard('ai');
                setSelectedSubTab('ai');
              }}
              className="bg-white rounded-2xl p-8 text-left hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#e60023]/20 transition-colors">
                <Sparkles size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">AI Custom Analytics</h3>
              <p className="text-[#666666] leading-relaxed">
                Ask questions and generate custom insights using natural language
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view with tabs
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-[#e0e0e0] sticky top-0 z-50">
        <div className="flex items-center gap-4 px-6 py-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedDashboard(null)}
            className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-[#1a1a1a]" />
          </button>

          {/* Horizontal Tabs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedDashboard('team');
                setSelectedSubTab('innings');
              }}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedDashboard === 'team'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-transparent text-[#666666] hover:bg-[#f5f5f5]'
              }`}
            >
              Team Performance
            </button>
            <button
              onClick={() => {
                setSelectedDashboard('player');
                setSelectedSubTab('batting');
              }}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedDashboard === 'player'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-transparent text-[#666666] hover:bg-[#f5f5f5]'
              }`}
            >
              Player Performance
            </button>
            <button
              onClick={() => {
                setSelectedDashboard('tournament');
                setSelectedSubTab('standings');
              }}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedDashboard === 'tournament'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-transparent text-[#666666] hover:bg-[#f5f5f5]'
              }`}
            >
              Tournament Performance
            </button>
            <button
              onClick={() => {
                setSelectedDashboard('ai');
                setSelectedSubTab('ai');
              }}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedDashboard === 'ai'
                  ? 'bg-[#e60023] text-white'
                  : 'bg-transparent text-[#666666] hover:bg-[#f5f5f5]'
              }`}
            >
              AI Custom Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="bg-white border-b border-[#e0e0e0] px-6 py-4">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Global Filters</h3>
        <div className="flex flex-wrap gap-3">
          <MultiSelectDropdown
            label="Tournament"
            options={['IPL 2024', 'T20 World Cup', 'The Hundred']}
            selected={globalFilters.tournament}
            onChange={(val) => setGlobalFilters({ ...globalFilters, tournament: val })}
          />
          <MultiSelectDropdown
            label="Home Team"
            options={['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers']}
            selected={globalFilters.homeTeam}
            onChange={(val) => setGlobalFilters({ ...globalFilters, homeTeam: val })}
          />
          <MultiSelectDropdown
            label="Home/Away"
            options={['Home', 'Away', 'Neutral']}
            selected={globalFilters.homeAway}
            onChange={(val) => setGlobalFilters({ ...globalFilters, homeAway: val })}
          />
          <MultiSelectDropdown
            label="Toss Result"
            options={['Won', 'Lost']}
            selected={globalFilters.tossResult}
            onChange={(val) => setGlobalFilters({ ...globalFilters, tossResult: val })}
          />
          <MultiSelectDropdown
            label="Bat/Field First"
            options={['Bat First', 'Field First']}
            selected={globalFilters.batFieldFirst}
            onChange={(val) => setGlobalFilters({ ...globalFilters, batFieldFirst: val })}
          />
          <MultiSelectDropdown
            label="Match Type"
            options={['T20', '50 overs']}
            selected={globalFilters.matchType}
            onChange={(val) => setGlobalFilters({ ...globalFilters, matchType: val })}
          />
        </div>
      </div>

      {/* Render Selected Dashboard */}
      <div className="p-6">
        {selectedDashboard === 'team' && (
          <TeamPerformanceDashboard selectedSubTab={selectedSubTab} setSelectedSubTab={setSelectedSubTab} />
        )}
        {selectedDashboard === 'player' && (
          <PlayerPerformanceDashboard selectedSubTab={selectedSubTab} setSelectedSubTab={setSelectedSubTab} />
        )}
        {selectedDashboard === 'tournament' && (
          <TournamentPerformanceDashboard selectedSubTab={selectedSubTab} setSelectedSubTab={setSelectedSubTab} />
        )}
        {selectedDashboard === 'ai' && <AICustomAnalyticsDashboard />}
      </div>
    </div>
  );
}

// Range Slider Component
function RangeSlider({ min, max, value, onChange }: { min: number; max: number; value: [number, number]; onChange: (value: [number, number]) => void }) {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseInt(e.target.value);
    const newValue: [number, number] = [Math.min(newMin, localValue[1]), localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value);
    const newValue: [number, number] = [localValue[0], Math.max(newMax, localValue[0])];
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="px-4 py-3 border border-[#e0e0e0] rounded-lg bg-white min-w-[200px]">
      <div className="text-sm text-[#666666] mb-3">Overs: {localValue[0]} - {localValue[1]}</div>
      <div className="relative h-2">
        <div className="absolute w-full h-2 bg-[#e0e0e0] rounded-lg"></div>
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
      </div>
    </div>
  );
}

// Multi-select Dropdown Component
function MultiSelectDropdown({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(v => v !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm bg-white hover:border-[#e60023] focus:border-[#e60023] focus:outline-none transition-colors flex items-center gap-2 min-w-[150px] justify-between"
      >
        <span className="text-[#666666]">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown size={16} className="text-[#666666]" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-4 py-2 hover:bg-[#f5f5f5] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 rounded border-[#e0e0e0] text-[#e60023] focus:ring-[#e60023] focus:ring-offset-0 cursor-pointer accent-[#e60023]"
                  style={{
                    accentColor: '#e60023'
                  }}
                />
                <span className="text-sm text-[#1a1a1a]">{option}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Date Range Picker Component
function DateRangePicker({ startDate, endDate, onChange }: { startDate: string; endDate: string; onChange: (start: string, end: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const handleApply = () => {
    onChange(localStart, localEnd);
    setIsOpen(false);
  };

  const displayText = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Date Range';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm bg-white hover:border-[#e60023] focus:border-[#e60023] focus:outline-none transition-colors flex items-center gap-2"
      >
        <Calendar size={16} className="text-[#666666]" />
        <span className="text-[#666666]">{displayText}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-20 p-4 min-w-[300px]">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#666666] mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:border-[#e60023] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#666666] mb-1 block">End Date</label>
                <input
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg text-sm focus:border-[#e60023] focus:outline-none"
                />
              </div>
              <button
                onClick={handleApply}
                className="w-full px-4 py-2 bg-[#e60023] text-white rounded-lg text-sm font-medium hover:bg-[#c41e3a] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Team Performance Dashboard Component
function TeamPerformanceDashboard({ selectedSubTab, setSelectedSubTab }: { selectedSubTab: string; setSelectedSubTab: (tab: string) => void }) {
  const [oversRange, setOversRange] = useState<[number, number]>([1, 20]);
  const [oppositionTeam, setOppositionTeam] = useState<string[]>([]);
  const [venue, setVenue] = useState<string[]>([]);

  // Innings Progression Data
  const runRateData = [
    { over: 1, runRate: 6.5 },
    { over: 2, runRate: 7.2 },
    { over: 3, runRate: 7.8 },
    { over: 4, runRate: 7.5 },
    { over: 5, runRate: 8.9 },
    { over: 6, runRate: 10.5 },
    { over: 7, runRate: 9.8 },
    { over: 8, runRate: 8.2 },
    { over: 9, runRate: 9.1 },
    { over: 10, runRate: 11.2 },
  ];

  const boundaryData = [
    { name: 'Fours', value: 45, color: '#c41e3a' },
    { name: 'Sixes', value: 25, color: '#ff4d6d' },
    { name: 'Singles', value: 68, color: '#8b0000' },
    { name: 'Twos', value: 32, color: '#ff758f' },
    { name: 'Threes', value: 12, color: '#ffb3c1' },
  ];

  const partnershipData = [
    { partnership: 'P1', runs: 45 },
    { partnership: 'P2', runs: 68 },
    { partnership: 'P3', runs: 34 },
    { partnership: 'P4', runs: 52 },
    { partnership: 'P5', runs: 28 },
  ];

  // Bowling & Fielding Data
  const economyData = [
    { phase: 'Powerplay', economy: 6.5, wickets: 2.5 },
    { phase: 'Middle', economy: 5.2, wickets: 3.8 },
    { phase: 'Death', economy: 9.5, wickets: 4.2 },
  ];

  const extrasData = [
    { name: 'Wides', value: 28, color: '#c41e3a' },
    { name: 'No Balls', value: 12, color: '#ff4d6d' },
    { name: 'Byes', value: 8, color: '#8b0000' },
    { name: 'Leg Byes', value: 15, color: '#ffb3c1' },
  ];

  const wicketTimelineData = [
    { over: 3, wickets: 1 },
    { over: 7, wickets: 2 },
    { over: 12, wickets: 3 },
    { over: 15, wickets: 5 },
    { over: 18, wickets: 8 },
  ];

  // Match Impact Data
  const requiredRunRateData = [
    { over: 10, rrr: 8.5 },
    { over: 12, rrr: 8.8 },
    { over: 14, rrr: 9.5 },
    { over: 16, rrr: 11.2 },
    { over: 18, rrr: 13.8 },
    { over: 20, rrr: 0 },
  ];

  const battingPositionData = [
    { position: 'Top Order', runs: 125 },
    { position: 'Middle Order', runs: 89 },
    { position: 'Lower Order', runs: 45 },
  ];

  return (
    <div>
      {/* Team Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Team Filters</h3>
        <div className="flex flex-wrap gap-3">
          <MultiSelectDropdown
            label="Opposition Team"
            options={['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers', 'Kolkata Knight Riders']}
            selected={oppositionTeam}
            onChange={setOppositionTeam}
          />
          <MultiSelectDropdown
            label="Venue"
            options={['Wankhede Stadium', 'Eden Gardens', 'M. Chinnaswamy Stadium', 'Feroz Shah Kotla']}
            selected={venue}
            onChange={setVenue}
          />
          <RangeSlider min={1} max={20} value={oversRange} onChange={setOversRange} />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSelectedSubTab('innings')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'innings'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Innings Progression
        </button>
        <button
          onClick={() => setSelectedSubTab('bowling')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'bowling'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Bowling & Fielding Control
        </button>
        <button
          onClick={() => setSelectedSubTab('impact')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'impact'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Match Impact & Strategy
        </button>
      </div>

      {/* Tab 1: Innings Progression */}
      {selectedSubTab === 'innings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Run Rate Progression */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Run Rate Progression by Over</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={runRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="over" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="runRate" name="Run Rate" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Boundary Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Boundary & Scoring Shot Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={boundaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {boundaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Partnership Contribution */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Partnership Contribution Map</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={partnershipData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="partnership" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="runs" name="Runs" fill="#e60023" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Power Play Efficiency */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex flex-col justify-center items-center">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-8 self-start">Power Play vs Non-Power Play Efficiency</h3>
            <div className="text-center">
              <p className="text-sm text-[#666666] mb-3">Powerplay Run Rate</p>
              <p className="text-7xl font-bold text-[#1a1a1a] mb-3">8.2</p>
              <p className="text-sm text-[#e60023] flex items-center justify-center gap-1">
                <span>↑</span>
                <span>12% vs avg</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bowling & Fielding Control */}
      {selectedSubTab === 'bowling' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bowling Economy by Phase */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Bowling Economy by Phase</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={economyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="phase" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="economy" name="Economy" fill="#e60023" />
                <Bar dataKey="wickets" name="Wickets" fill="#ff758f" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Extras Conceded */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Extras Conceded Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={extrasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {extrasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Wicket Fall Timeline */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Wicket Fall Timeline</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={wicketTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="over" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="wickets" name="Wickets" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Fielding Runs Saved/Lost */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-6">Fielding Runs Saved/Lost</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-[#f0f0f0]">
                <span className="text-[#1a1a1a]">Catches Taken</span>
                <span className="text-[#e60023] font-semibold">+24</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#f0f0f0]">
                <span className="text-[#1a1a1a]">Run Outs</span>
                <span className="text-[#e60023] font-semibold">+12</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#f0f0f0]">
                <span className="text-[#1a1a1a]">Misfields</span>
                <span className="text-[#e60023] font-semibold">-8</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[#1a1a1a] font-semibold">Net Runs Impact</span>
                <span className="text-[#e60023] font-bold text-lg">+28</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Match Impact & Strategy */}
      {selectedSubTab === 'impact' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Toss Decision Impact */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex flex-col justify-center items-center">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-8 self-start">Toss Decision Impact on Result</h3>
            <div className="text-center">
              <p className="text-8xl font-bold text-[#e60023] mb-4">72%</p>
              <p className="text-sm text-[#666666]">Win rate when batting first</p>
            </div>
          </div>

          {/* Required Run Rate Pressure Curve */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Required Run Rate Pressure Curve</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={requiredRunRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="over" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rrr" name="Required Run Rate" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Batting Position Contribution */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Batting Position Contribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={battingPositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="position" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="runs" name="Runs" fill="#e60023" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bowler Type Effectiveness */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-6">Bowler Type Effectiveness</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-[#f0f0f0]">
                <span className="text-[#1a1a1a]">Pace</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-[#666666]">Econ: <span className="font-semibold text-[#1a1a1a]">7.2</span></span>
                  <span className="text-[#666666]">Wkts: <span className="font-semibold text-[#1a1a1a]">12</span></span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#f0f0f0]">
                <span className="text-[#1a1a1a]">Spin</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-[#666666]">Econ: <span className="font-semibold text-[#1a1a1a]">6.8</span></span>
                  <span className="text-[#666666]">Wkts: <span className="font-semibold text-[#1a1a1a]">8</span></span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[#1a1a1a]">Medium Pace</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-[#666666]">Econ: <span className="font-semibold text-[#1a1a1a]">8.1</span></span>
                  <span className="text-[#666666]">Wkts: <span className="font-semibold text-[#1a1a1a]">5</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Player Performance Dashboard Component
function PlayerPerformanceDashboard({ selectedSubTab, setSelectedSubTab }: { selectedSubTab: string; setSelectedSubTab: (tab: string) => void }) {
  const [batter, setBatter] = useState<string[]>([]);
  const [batterStyle, setBatterStyle] = useState<string[]>([]);
  const [bowler, setBowler] = useState<string[]>([]);
  const [bowlerType, setBowlerType] = useState<string[]>([]);
  const [bowlerStyle, setBowlerStyle] = useState<string[]>([]);
  const [deliveryLine, setDeliveryLine] = useState<string[]>([]);
  const [deliveryLength, setDeliveryLength] = useState<string[]>([]);
  const [bowlerAction, setBowlerAction] = useState<string[]>([]);

  const dotBallData = [
    { innings: 1, pressure: 35 },
    { innings: 5, pressure: 42 },
    { innings: 10, pressure: 38 },
    { innings: 15, pressure: 28 },
    { innings: 20, pressure: 18 },
  ];

  const shotSelectionData = [
    { name: 'Cover Drive', value: 35, color: '#c41e3a' },
    { name: 'Pull Shot', value: 25, color: '#ff4d6d' },
    { name: 'Cut Shot', value: 20, color: '#8b0000' },
    { name: 'Sweep', value: 12, color: '#ff758f' },
    { name: 'Loft', value: 8, color: '#ffb3c1' },
  ];

  const speedData = [
    { range: '130-140', deliveries: 45 },
    { range: '140-145', deliveries: 78 },
    { range: '145-150', deliveries: 62 },
    { range: '150-155', deliveries: 24 },
    { range: '155+', deliveries: 8 },
  ];

  const swingData = [
    { type: 'Inswing', deliveries: 48 },
    { type: 'Outswing', deliveries: 42 },
    { type: 'Off-Cutter', deliveries: 25 },
    { type: 'Leg-Cutter', deliveries: 18 },
  ];

  const headToHeadData = [
    { bowler: 'J. Bumrah', runs: 45, balls: 67, avg: 22.5, sr: 67.2 },
    { bowler: 'P. Cummins', runs: 62, balls: 89, avg: 31, sr: 69.7 },
    { bowler: 'R. Khan', runs: 38, balls: 52, avg: 19, sr: 73.1 },
    { bowler: 'M. Starc', runs: 51, balls: 71, avg: 25.5, sr: 71.8 },
  ];

  const dismissalData = [
    { name: 'Bowled', value: 28, color: '#c41e3a' },
    { name: 'Caught', value: 42, color: '#ff4d6d' },
    { name: 'LBW', value: 18, color: '#8b0000' },
    { name: 'Run Out', value: 8, color: '#ff758f' },
    { name: 'Stumped', value: 4, color: '#ffb3c1' },
  ];

  const bowlerTypePerformanceData = [
    { type: 'Pace', average: 45, strikeRate: 135 },
    { type: 'Spin', average: 52, strikeRate: 148 },
    { type: 'Medium', average: 38, strikeRate: 122 },
  ];

  const spellFormData = [
    { spell: 1, economy: 6.5 },
    { spell: 2, economy: 8.2 },
    { spell: 3, economy: 7.8 },
    { spell: 4, economy: 9.5 },
  ];

  return (
    <div>
      {/* Player Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Player Filters</h3>
        <div className="flex flex-wrap gap-3">
          <MultiSelectDropdown
            label="Batter"
            options={['Virat Kohli', 'Rohit Sharma', 'Steve Smith', 'Kane Williamson']}
            selected={batter}
            onChange={setBatter}
          />
          <MultiSelectDropdown
            label="Batter Style"
            options={['RHB', 'LHB']}
            selected={batterStyle}
            onChange={setBatterStyle}
          />
          <MultiSelectDropdown
            label="Bowler"
            options={['Jasprit Bumrah', 'Mohammed Shami', 'Pat Cummins', 'Rashid Khan']}
            selected={bowler}
            onChange={setBowler}
          />
          <MultiSelectDropdown
            label="Bowler Type"
            options={['Spin', 'Pace', 'Medium Pace']}
            selected={bowlerType}
            onChange={setBowlerType}
          />
          <MultiSelectDropdown
            label="Bowler Style"
            options={['RHB', 'LHB']}
            selected={bowlerStyle}
            onChange={setBowlerStyle}
          />
          <MultiSelectDropdown
            label="Delivery Line"
            options={['Outside Off', 'Middle', 'Leg']}
            selected={deliveryLine}
            onChange={setDeliveryLine}
          />
          <MultiSelectDropdown
            label="Delivery Length"
            options={['Short', 'Good Length', 'Full', 'Yorker']}
            selected={deliveryLength}
            onChange={setDeliveryLength}
          />
          <MultiSelectDropdown
            label="Bowler Action"
            options={['Over Wicket', 'Around Wicket']}
            selected={bowlerAction}
            onChange={setBowlerAction}
          />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSelectedSubTab('batting')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'batting'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Batting Execution
        </button>
        <button
          onClick={() => setSelectedSubTab('bowling')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'bowling'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Bowling Execution
        </button>
        <button
          onClick={() => setSelectedSubTab('matchups')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'matchups'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Matchups & Trends
        </button>
      </div>

      {/* Tab 1: Batting Execution */}
      {selectedSubTab === 'batting' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KPI Cards */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-6">Batter Strike Rate & Average</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-[#666666] mb-2">Strike Rate</p>
                <p className="text-5xl font-bold text-[#1a1a1a] mb-2">142.5</p>
                <p className="text-sm text-[#e60023]">↑ 8% vs avg</p>
              </div>
              <div>
                <p className="text-sm text-[#666666] mb-2">Average</p>
                <p className="text-5xl font-bold text-[#1a1a1a] mb-2">48.7</p>
                <p className="text-sm text-[#e60023]">↓ 3% vs avg</p>
              </div>
            </div>
          </div>

          {/* Dot Ball Pressure */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Dot Ball Pressure Index</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dotBallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="innings" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pressure" name="Pressure %" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Shot Selection Map */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Shot Selection Map</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={shotSelectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {shotSelectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Wagon Wheel */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Wagon Wheel</h3>
            <div className="flex items-center justify-center h-[280px]">
              <div className="relative w-64 h-64">
                {/* Cricket field circle */}
                <div className="absolute inset-0 border-4 border-[#e0e0e0] rounded-full"></div>
                {/* Center pitch */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#f5f5f5] rounded-full"></div>
                {/* Shot lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256">
                  <line x1="128" y1="128" x2="200" y2="60" stroke="#e60023" strokeWidth="3" />
                  <line x1="128" y1="128" x2="180" y2="128" stroke="#e60023" strokeWidth="3" />
                  <line x1="128" y1="128" x2="160" y2="190" stroke="#ff4d6d" strokeWidth="2" />
                  <line x1="128" y1="128" x2="60" y2="100" stroke="#ff758f" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bowling Execution */}
      {selectedSubTab === 'bowling' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bowler KPIs */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-6">Bowler Economy, SR & Wickets</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-[#666666] mb-2">Economy</p>
                <p className="text-4xl font-bold text-[#1a1a1a]">6.8</p>
              </div>
              <div>
                <p className="text-sm text-[#666666] mb-2">Strike Rate</p>
                <p className="text-4xl font-bold text-[#1a1a1a]">18.5</p>
              </div>
              <div>
                <p className="text-sm text-[#666666] mb-2">Wickets</p>
                <p className="text-4xl font-bold text-[#1a1a1a]">24</p>
                <p className="text-sm text-[#e60023]">↑ 15% vs avg</p>
              </div>
            </div>
          </div>

          {/* Pitch Map */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Pitch Map (Length & Line)</h3>
            <div className="grid grid-cols-3 gap-2 h-[240px]">
              {[
                ['#ffb3c1', '#e60023', '#ff758f'],
                ['#ff758f', '#ff4d6d', '#ffb3c1'],
                ['#e60023', '#ff758f', '#ffb3c1'],
              ].map((row, i) => (
                <div key={i} className="grid grid-rows-3 gap-2">
                  {row.map((color, j) => (
                    <div key={j} className="rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bowling Speed */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Bowling Speed & Variation Profile</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={speedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="deliveries" name="Deliveries" fill="#e60023" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Swing Analysis */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Swing & Deviation Analysis</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={swingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="deliveries" name="Deliveries" fill="#e60023" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Matchups & Trends */}
      {selectedSubTab === 'matchups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Head-to-Head */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Batter vs Bowler Head-to-Head</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-2 font-semibold text-[#666666]">Bowler</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Runs</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Balls</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Avg</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {headToHeadData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0]">
                      <td className="py-2 text-[#1a1a1a]">{row.bowler}</td>
                      <td className="py-2 text-center text-[#666666]">{row.runs}</td>
                      <td className="py-2 text-center text-[#666666]">{row.balls}</td>
                      <td className="py-2 text-center text-[#666666]">{row.avg}</td>
                      <td className="py-2 text-center text-[#666666]">{row.sr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dismissal Type */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Dismissal Type & Pattern Analysis</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dismissalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dismissalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance by Bowler Type */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Batter Performance by Bowler Type</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bowlerTypePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average" fill="#c41e3a" />
                <Bar dataKey="strikeRate" name="Strike Rate" fill="#ff758f" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Spell Form */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Spell & Over-by-Over Bowler Form</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={spellFormData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="spell" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="economy" name="Economy" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Tournament Performance Dashboard Component
function TournamentPerformanceDashboard({ selectedSubTab, setSelectedSubTab }: { selectedSubTab: string; setSelectedSubTab: (tab: string) => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const pointsTableData = [
    { team: 'India', m: 14, w: 10, l: 4, pts: 20, nrr: 1.25, winPct: 71.4 },
    { team: 'Australia', m: 14, w: 9, l: 5, pts: 18, nrr: 0.85, winPct: 64.3 },
    { team: 'England', m: 14, w: 8, l: 6, pts: 16, nrr: 0.45, winPct: 57.1 },
    { team: 'New Zealand', m: 14, w: 7, l: 7, pts: 14, nrr: -0.12, winPct: 50.0 },
    { team: 'South Africa', m: 14, w: 6, l: 8, pts: 12, nrr: -0.38, winPct: 42.9 },
  ];

  const runRateComparisonData = [
    { match: 'M1', runRate: 8.5 },
    { match: 'M2', runRate: 7.2 },
    { match: 'M3', runRate: 9.8 },
    { match: 'M4', runRate: 6.9 },
    { match: 'M5', runRate: 8.7 },
  ];

  const topRunScorers = [
    { player: 'Virat Kohli', runs: 892, avg: 62.3, sr: 142.5 },
    { player: 'Rohit Sharma', runs: 845, avg: 58.2, sr: 138.8 },
    { player: 'Steve Smith', runs: 778, avg: 54.1, sr: 128.4 },
    { player: 'Kane Williamson', runs: 756, avg: 52.5, sr: 125.7 },
  ];

  const topWicketTakers = [
    { player: 'J. Bumrah', wickets: 24, avg: 18.5, econ: 6.8 },
    { player: 'P. Cummins', wickets: 22, avg: 19.8, econ: 7.2 },
    { player: 'R. Khan', wickets: 21, avg: 17.2, econ: 6.5 },
    { player: 'T. Boult', wickets: 20, avg: 20.1, econ: 7.5 },
  ];

  const economicalBowlers = [
    { player: 'R. Khan', matches: 14, overs: 56, runs: 364, econ: 6.5 },
    { player: 'J. Bumrah', matches: 14, overs: 58, runs: 394, econ: 6.8 },
    { player: 'S. Narine', matches: 12, overs: 48, runs: 331, econ: 6.9 },
    { player: 'P. Cummins', matches: 14, overs: 56, runs: 403, econ: 7.2 },
  ];

  const partnerships = [
    { players: 'V. Kohli & R. Sharma', runs: 184, balls: 112, match: 'vs AUS' },
    { players: 'D. Warner & A. Finch', runs: 172, balls: 108, match: 'vs ENG' },
    { players: 'J. Bairstow & J. Roy', runs: 168, balls: 102, match: 'vs IND' },
    { players: 'Q. de Kock & R. Hendricks', runs: 156, balls: 95, match: 'vs NZ' },
  ];

  const venueAdvantageData = [
    { venue: 'MCG', tossWin: 50.1, batFirst: 54.0, fieldFirst: 61.2 },
    { venue: 'Lords', tossWin: 67.0, batFirst: 82.8, fieldFirst: 74.2 },
    { venue: 'Eden Gardens', tossWin: 51.9, batFirst: 76.5, fieldFirst: 75.8 },
    { venue: 'Wankhede', tossWin: 52.6, batFirst: 71.0, fieldFirst: 51.2 },
  ];

  const extrasPerTeamData = [
    { team: 'India', extras: 15 },
    { team: 'Australia', extras: 22 },
    { team: 'England', extras: 19 },
    { team: 'NZ', extras: 20 },
  ];

  return (
    <div>
      {/* Tournament Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Tournament Filters</h3>
        <div className="flex gap-3">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSelectedSubTab('standings')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'standings'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Standings & Totals
        </button>
        <button
          onClick={() => setSelectedSubTab('performers')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'performers'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Top Performers
        </button>
        <button
          onClick={() => setSelectedSubTab('conditions')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'conditions'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Conditions & Venues
        </button>
      </div>

      {/* Tab 1: Standings & Totals */}
      {selectedSubTab === 'standings' && (
        <div className="space-y-6">
          {/* Points Table */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Tournament Points Table & Win %</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#666666]">Team</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">M</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">W</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">L</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">Pts</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">NRR</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#666666]">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTableData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{row.team}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.m}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.w}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.l}</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#1a1a1a]">{row.pts}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.nrr}</td>
                      <td className="py-3 px-4 text-center font-semibold text-[#e60023]">{row.winPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Highest & Lowest Team Totals</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[#666666] mb-2">Highest Totals</p>
                  <p className="text-[#1a1a1a]">India: 224/4</p>
                  <p className="text-[#1a1a1a]">Australia: 218/5</p>
                  <p className="text-[#1a1a1a]">England: 212/6</p>
                </div>
                <div className="pt-3 border-t border-[#f0f0f0]">
                  <p className="text-sm text-[#666666] mb-2">Lowest Totals</p>
                  <p className="text-[#1a1a1a]">Bangladesh: 98/10</p>
                  <p className="text-[#1a1a1a]">Zimbabwe: 105/9</p>
                  <p className="text-[#1a1a1a]">Afghanistan: 112/8</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Run Rate Comparison Across Matches</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={runRateComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="match" stroke="#666666" />
                  <YAxis stroke="#666666" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="runRate" name="Run Rate" fill="#e60023" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Performers */}
      {selectedSubTab === 'performers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Run Scorers */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Top Run Scorers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-2 font-semibold text-[#666666]">Player</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Runs</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Average</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Strike Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topRunScorers.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0]">
                      <td className="py-2 text-[#1a1a1a]">{row.player}</td>
                      <td className="py-2 text-center font-semibold text-[#e60023]">{row.runs}</td>
                      <td className="py-2 text-center text-[#666666]">{row.avg}</td>
                      <td className="py-2 text-center text-[#666666]">{row.sr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Wicket Takers */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Top Wicket Takers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-2 font-semibold text-[#666666]">Player</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Wickets</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Average</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Economy</th>
                  </tr>
                </thead>
                <tbody>
                  {topWicketTakers.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0]">
                      <td className="py-2 text-[#1a1a1a]">{row.player}</td>
                      <td className="py-2 text-center font-semibold text-[#e60023]">{row.wickets}</td>
                      <td className="py-2 text-center text-[#666666]">{row.avg}</td>
                      <td className="py-2 text-center text-[#666666]">{row.econ}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Economical Bowlers */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Most Economical Bowlers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-2 font-semibold text-[#666666]">Player</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Matches</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Overs</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Runs</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Economy</th>
                  </tr>
                </thead>
                <tbody>
                  {economicalBowlers.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0]">
                      <td className="py-2 text-[#1a1a1a]">{row.player}</td>
                      <td className="py-2 text-center text-[#666666]">{row.matches}</td>
                      <td className="py-2 text-center text-[#666666]">{row.overs}</td>
                      <td className="py-2 text-center text-[#666666]">{row.runs}</td>
                      <td className="py-2 text-center font-semibold text-[#e60023]">{row.econ}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partnership Records */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Partnership Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-2 font-semibold text-[#666666]">Players</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Runs</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Balls</th>
                    <th className="text-center py-2 font-semibold text-[#666666]">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerships.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0]">
                      <td className="py-2 text-[#1a1a1a]">{row.players}</td>
                      <td className="py-2 text-center font-semibold text-[#e60023]">{row.runs}</td>
                      <td className="py-2 text-center text-[#666666]">{row.balls}</td>
                      <td className="py-2 text-center text-[#666666]">{row.match}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Conditions & Venues */}
      {selectedSubTab === 'conditions' && (
        <div className="space-y-6">
          {/* Toss & Venue Advantage Matrix */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Toss & Venue Advantage Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Venue</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Toss Win %</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Bat First Win %</th>
                    <th className="text-center py-3 px-4 font-semibold text-[#666666]">Field First Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {venueAdvantageData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 text-[#1a1a1a]">{row.venue}</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.tossWin}%</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.batFirst}%</td>
                      <td className="py-3 px-4 text-center text-[#666666]">{row.fieldFirst}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extras Per Team */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Extras Conceded per Team</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={extrasPerTeamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="team" stroke="#666666" />
                  <YAxis stroke="#666666" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="extras" name="Extras" fill="#e60023" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Venue Scoring Pattern */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Venue Scoring Pattern Analysis</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-[#666666] mb-2">Average First Innings</p>
                  <p className="text-5xl font-bold text-[#1a1a1a]">168</p>
                </div>
                <div>
                  <p className="text-sm text-[#666666] mb-2">Average Second Innings</p>
                  <p className="text-5xl font-bold text-[#1a1a1a]">154</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AI Custom Analytics Dashboard Component
function AICustomAnalyticsDashboard() {
  const [query, setQuery] = useState('');

  const insightsData = [
    { matchup: 'India vs Aus', runRate: 9.8 },
    { matchup: 'India vs Eng', runRate: 8.2 },
    { matchup: 'India vs NZ', runRate: 10.5 },
    { matchup: 'India vs SA', runRate: 8.9 },
  ];

  const suggestedQueries = [
    'Compare team performance across tournaments',
    'Analyze player strike rates by opposition',
    'Find best bowling matchups',
    'Discover venue advantages',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - AI Query Assistant */}
      <div className="lg:col-span-4 bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-[#e60023]" />
          <h3 className="text-lg font-semibold text-[#1a1a1a]">AI Query Assistant</h3>
        </div>
        <p className="text-sm text-[#666666] mb-6">Ask me anything about your cricket data:</p>

        {/* Suggested Queries */}
        <div className="space-y-3 mb-6">
          {suggestedQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(q)}
              className="w-full text-left p-3 rounded-lg bg-[#f9f9f9] hover:bg-[#f0f0f0] transition-colors text-sm text-[#1a1a1a] flex items-start gap-2"
            >
              <span className="text-[#e60023]">•</span>
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="mt-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your question here..."
              className="w-full px-4 py-3 pr-12 border border-[#e0e0e0] rounded-lg focus:border-[#e60023] focus:outline-none text-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#e60023] rounded-lg flex items-center justify-center hover:bg-[#c41e3a] transition-colors">
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Generated Insights */}
      <div className="lg:col-span-8 bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold text-[#1a1a1a] mb-6">Generated Insights</h3>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={insightsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="matchup" stroke="#666666" />
            <YAxis stroke="#666666" />
            <Tooltip />
            <Legend />
            <Bar dataKey="runRate" fill="#e60023" name="Run Rate" />
          </BarChart>
        </ResponsiveContainer>

        {/* AI Analysis Text */}
        <div className="mt-6 p-4 bg-[#f9f9f9] rounded-lg">
          <h4 className="font-semibold text-[#1a1a1a] mb-3">AI Analysis</h4>
          <p className="text-sm text-[#666666] leading-relaxed">
            India demonstrates the strongest performance against New Zealand with a run rate of 9.1, showing aggressive batting approach.
            The matchup against South Africa reveals a more conservative strategy with 6.8 run rate, possibly due to challenging bowling
            conditions or pitch characteristics.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NVPlayAnalytics;
