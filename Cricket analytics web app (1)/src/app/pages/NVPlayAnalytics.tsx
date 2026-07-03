  import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Users, Trophy, Sparkles, ChevronDown, Calendar, Send, X } from 'lucide-react';
import {
  getTeamStreams,
  getBowlerTypes,
  getBowlers,
  getMaxOver,
  getTopCatchTakers,
  getRunsStrikeRatePerWicket,
  getShotDistribution,
  getBowlingScoreBreakdown,
  getBowlingShotDistribution,
  getBattingKPIs,
  getTopBatters,
  getScoreBreakdown,
  getPartnershipAnalysis,
  getPlayerStreams,
  getRunsPerWicket,
  getTournamentStreams,
  getOppositionTeams,
  getVenues,
  getCoreAnalytics,
  getTeams,
  getBatters,
  getBattingExecution,
  getBattingExecutionCharts,
  getBowlingExecution,
  getBowlingExecutionCharts,
  getTopBowlers
} from '../../lib/nvplayanalytics';
import { LineChart, ComposedChart,Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, LabelList,Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface NVPlayAnalyticsProps {
  onNavigate?: (path: string) => void;
}
 
export function NVPlayAnalytics({ onNavigate }: NVPlayAnalyticsProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<string>('');
  const [teams, setTeams] = useState<string[]>([]);
  useEffect(() => {
    console.log("HOME TEAM OPTIONS:", teams);
}, [teams]);


  const [bowlerTypeOptions, setBowlerTypeOptions] =  useState<string[]>([]);

  // Global filters state
  const [globalFilters, setGlobalFilters] = useState({
  tournament: [] as string[],
  homeTeam: [] as string[],
  homeAway: [] as string[],
  matchType: [] as string[],
  matchResult: [] as string[],
  batFieldFirst: [] as string[],
  dateFrom: '',
  dateTo: '',
});
  useEffect(() => {
  getTeams()
    .then((data) => {
      setTeams(data.map((t) => t.team_name));
    })
    .catch((err) => {
      console.error('Failed to load teams', err);
    });
}, []);

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
                setSelectedSubTab('core');
              }}
              className="bg-white rounded-2xl p-8 text-left hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-[#e60023]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#e60023]/20 transition-colors">
                <BarChart3 size={24} className="text-[#e60023]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">Team Performance</h3>
              <p className="text-[#666666] leading-relaxed">
                Analyze Batting, Bowling, Fielding
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
                setSelectedSubTab('core');
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
          showLabel
            label="Tournament"
            options={['IPL 2024', 'T20 World Cup', 'The Hundred']}
            selected={globalFilters.tournament}
            onChange={(val) => setGlobalFilters({ ...globalFilters, tournament: val })}
            singleSelect
          />
          
          <MultiSelectDropdown
          showLabel
    label="Home Team"
    options={teams}
    selected={globalFilters.homeTeam}
    onChange={(val) => setGlobalFilters({
        ...globalFilters,
        homeTeam: val
    })}
    singleSelect
/>
          <MultiSelectDropdown
          showLabel
            label="Home/Away"
            options={['Home', 'Away', 'Neutral']}
            selected={globalFilters.homeAway}
            onChange={(val) =>              
              setGlobalFilters({
                ...globalFilters,
                homeAway: val
                
              })
            }
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
  label="Match Result"
  options={['Won', 'Lost']}
  selected={globalFilters.matchResult}
  onChange={(val) =>
    setGlobalFilters({
      ...globalFilters,
      matchResult: val,
    })
  }
  singleSelect
/>
          <MultiSelectDropdown
          showLabel
            label="Bat/Field First"
            options={['Bat First', 'Field First']}
            selected={globalFilters.batFieldFirst}
            onChange={(val) => setGlobalFilters({ ...globalFilters, batFieldFirst: val })}
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
            label="Match Type"
            options={['T20','50 Overs','Timed']}
            selected={globalFilters.matchType}
            onChange={(val) => setGlobalFilters({ ...globalFilters, matchType: val })}
            singleSelect
          />
          
          <DateRangePicker
          showLabel
            startDate={globalFilters.dateFrom}
            endDate={globalFilters.dateTo}
            onChange={(start, end) =>
              setGlobalFilters({
                ...globalFilters,
                dateFrom: start,
                dateTo: end,
              })
            }
          />
        </div>
      </div>

      {/* Render Selected Dashboard */}
      <div className="p-6">
        {selectedDashboard === 'team' && (
          <TeamPerformanceDashboard
  selectedSubTab={selectedSubTab}
  setSelectedSubTab={setSelectedSubTab}
  globalFilters={globalFilters}
/>
        )}
        {selectedDashboard === 'player' && (
<PlayerPerformanceDashboard
  selectedSubTab={selectedSubTab}
  setSelectedSubTab={setSelectedSubTab}
  globalFilters={globalFilters}
/>        )}
        {selectedDashboard === 'tournament' && (
          <TournamentPerformanceDashboard
  selectedSubTab={selectedSubTab}
  setSelectedSubTab={setSelectedSubTab}
  globalFilters={globalFilters}
/>
        )}
        {selectedDashboard === 'ai' && <AICustomAnalyticsDashboard />}
      </div>
    </div>
  );
}

// Range Slider Component
function RangeSlider({
  min,
  max,
  value,
  onChange,
  showLabel = false
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  showLabel?: boolean;
}) {  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
  setLocalValue(value);
}, [value]);



const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newMin = parseInt(e.target.value);
  const newValue: [number, number] = [
    Math.min(newMin, localValue[1]),
    localValue[1],
  ];

  setLocalValue(newValue);
};

const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newMax = parseInt(e.target.value);

  const newValue: [number, number] = [
    localValue[0],
    Math.max(newMax, localValue[0]),
  ];

  setLocalValue(newValue);
};

const handleCommit = () => {
  onChange(localValue);
};

return (
  <div className="flex flex-col gap-1.5">
    {showLabel && (
      <label className="text-xs font-semibold text-[#555555] px-1">
        Overs
      </label>
    )}

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
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[1]}
          onChange={handleMaxChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e60023] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e60023] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />
      </div>
    </div>
     </div>
  );
}

// Multi-select Dropdown Component
function MultiSelectDropdown({
    label,
    options,
    selected,
    onChange,
    singleSelect = false,
    showLabel = false
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (value: string[]) => void;
    singleSelect?: boolean;
    showLabel?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

const toggleOption = (option: string) => {

    if (singleSelect) {

        if (selected.includes(option)) {
            onChange([]);
        } else {
            onChange([option]);
        }

        setIsOpen(false);
        return;
    }

    if (selected.includes(option)) {
        onChange(selected.filter(v => v !== option));
    } else {
        onChange([...selected, option]);
    }
};

const filteredOptions = options.filter((option) =>
  option.toLowerCase().includes(search.toLowerCase())
);

return (
  <div className="relative flex flex-col gap-1">
    {showLabel && (
      <label className="text-xs font-medium text-[#666666] px-1">
        {label}
      </label>
    )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm bg-white hover:border-[#e60023] focus:border-[#e60023] focus:outline-none transition-colors flex items-center gap-2 min-w-[150px] justify-between"
      >
        <span className="text-[#666666]">
          {selected.length === 0
    ? label
    : selected[0]}
        </span>
        <ChevronDown size={16} className="text-[#666666]" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-20 min-w-[250px]">
            <div className="p-2 border-b border-gray-200">
  <input
    type="text"
    placeholder={`Search ${label}...`}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    className="w-full px-3 py-2 text-sm border rounded-md outline-none focus:border-[#e60023]"
  />
</div>

<div className="max-h-60 overflow-y-auto">

</div>
            {filteredOptions.map((option) => (
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
function DateRangePicker({
  startDate,
  endDate,
  onChange,
  showLabel = false
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  showLabel?: boolean;
}) {  const [isOpen, setIsOpen] = useState(false);
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
  <div className="relative flex flex-col gap-1">
    {showLabel && (
      <label className="text-xs font-medium text-[#666666] px-1">
        Date Range
      </label>
    )}
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
function TeamPerformanceDashboard(
{
  selectedSubTab,
  setSelectedSubTab,
  globalFilters,
}: {
  selectedSubTab: string;
  setSelectedSubTab: (tab: string) => void;
  globalFilters: any;
}
) {
  const [oversRange, setOversRange] = useState<[number, number]>([1, 20]);
  const [maxOvers, setMaxOvers] = useState(20);

  const [oppositionTeam, setOppositionTeam] = useState<string[]>([]);
  const [venue, setVenue] = useState<string[]>([]);
  const [oppositionTeams, setOppositionTeams] = useState<string[]>([]);
  useEffect(() => {
  console.log("Opposition Teams:", oppositionTeams);
}, [oppositionTeams]);


  const [venues, setVenues] = useState<string[]>([]);
  const [coreStats, setCoreStats] = useState({
  matches_played: 0,
  wins: 0,
  losses: 0,
  tied: 0,
  no_result: 0,
  win_percentage: 0,
  net_run_rate: 0,
  avg_score: 0,
  avg_conceded: 0
});


  
  // Batting Data
  // Live team aggregations from the nv_play analyst stream (defaults render
  // before the fetch resolves; mapped into the existing chart shapes).
  const [runRateData, setRunRateData] = useState([
    { over: 1, runRate: 6.5 }, { over: 2, runRate: 7.2 }, { over: 3, runRate: 7.8 },
    { over: 4, runRate: 7.5 }, { over: 5, runRate: 8.9 }, { over: 6, runRate: 10.5 },
  ]);
  const [boundaryData, setBoundaryData] = useState([
  { name: "1s", value: 0, color: "#ffd6de" },
  { name: "2s", value: 0, color: "#ff9bb0" },
  { name: "4s", value: 0, color: "#e60023" },
  { name: "6s", value: 0, color: "#8b0000" },
]);

const [shotDistributionData, setShotDistributionData] = useState([
  { name: "0s", value: 0, color: "#6B7280" },
  { name: "1s", value: 0, color: "#3B82F6" },
  { name: "2s", value: 0, color: "#10B981" },
  { name: "3s", value: 0, color: "#A855F7" },
  { name: "4s", value: 0, color: "#F59E0B" },
  { name: "5s", value: 0, color: "#8B5CF6" },
  { name: "6s", value: 0, color: "#EF4444" },
  { name: "7s", value: 0, color: "#14B8A6" },
]);

const [bowlingBoundaryData, setBowlingBoundaryData] = useState([
  { name: "1s", value: 0, color: "#ffd6de" },
  { name: "2s", value: 0, color: "#ff9bb0" },
  { name: "4s", value: 0, color: "#e60023" },
  { name: "6s", value: 0, color: "#8b0000" },
]);

const [bowlingShotDistributionData, setBowlingShotDistributionData] = useState([
  { name: "0s", value: 0, color: "#6B7280" },
  { name: "1s", value: 0, color: "#3B82F6" },
  { name: "2s", value: 0, color: "#10B981" },
  { name: "3s", value: 0, color: "#A855F7" },
  { name: "4s", value: 0, color: "#F59E0B" },
  { name: "5s", value: 0, color: "#8B5CF6" },
  { name: "6s", value: 0, color: "#EF4444" },
  { name: "7s", value: 0, color: "#14B8A6" },
]);


const [boundaryBallsData, setBoundaryBallsData] = useState([
  { name: 'Boundary Balls', value: 0 },
  { name: 'Non-Boundary Balls', value: 0 },
]);



const [bowlingStats, setBowlingStats] = useState({
  wides: 0,
  no_balls: 0,
  leg_byes: 0,
  dot_balls: 0,
  legal_balls: 0,
  wickets: 0,
  innings: 0,
  maiden_overs_pct: 0,
  wickets_per_match: 0
});

const [fieldingStats, setFieldingStats] = useState({
  catches_taken: 0,
  runouts_effected: 0,
  byes_conceded: 0
});

const [topCatchTakers, setTopCatchTakers] = useState<
  { player: string; catches: number }[]
>([]);


  const [partnershipData, setPartnershipData] = useState<
  { partnership: string; runs: number }[]
>([]);  

const [runsPerWicketData, setRunsPerWicketData] = useState<
  { wicket: number; runs: number }[]
>([]);

const [partnershipAnalysisData, setPartnershipAnalysisData] = useState<
{
  partnership: string;
  runs: number;
  strike_rate: number;
}[]
>([]);


const [topBatters, setTopBatters] = useState<
  {
    batter: string;
    runs: number;
    strike_rate: number;
  }[]
>([]);

const [topBowlers, setTopBowlers] = useState<
  {
    bowler: string;
    wickets: number;
    economy: number;
  }[]
>([]);

const [runsStrikeRatePerWicket, setRunsStrikeRatePerWicket] = useState<
{
  bowler: string;
  runs: number;
  strike_rate: number;
}[]
>([]);

const [battingKPIs, setBattingKPIs] = useState({
  run_rate: "0.00",
  wickets_lost: "0.00",
});


  const [economyData, setEconomyData] = useState([
    { phase: 'Powerplay', economy: 6.5, wickets: 2.5 },
    { phase: 'Middle', economy: 5.2, wickets: 3.8 },
    { phase: 'Death', economy: 9.5, wickets: 4.2 },
  ]); 
  const [phaseData, setPhaseData] = useState([
 { phase: 'Powerplay', runRate: 0, wickets: 0 },
 { phase: 'Middle', runRate: 0, wickets: 0 },
 { phase: 'Death', runRate: 0, wickets: 0 }
]);

useEffect(() => {

    if (!globalFilters.homeTeam?.[0]) return;

    getMaxOver({
        home_team_id: globalFilters.homeTeam?.[0],
        opposition_team_id: oppositionTeam?.[0],
        venue: venue?.[0],
        tournament_id: globalFilters.tournament?.[0],
        home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
        match_result: globalFilters.matchResult?.[0],
        bat_field_first: globalFilters.batFieldFirst?.[0],
        match_type: globalFilters.matchType?.[0],
        date_from: globalFilters.dateFrom,
        date_to: globalFilters.dateTo,
    })
    .then((data) => {

        const max = Number(data.max_over) || 1;

       setMaxOvers(max);

setOversRange((prev) => {
    if (prev[0] === 1 && prev[1] === max) {
        return prev;
    }

    return [1, max];
});

    })
    .catch(console.error);

}, [
    globalFilters.homeTeam,
    oppositionTeam,
    venue,
    globalFilters.tournament,
    globalFilters.homeAway,
    globalFilters.matchResult,
    globalFilters.batFieldFirst,
    globalFilters.matchType,
    globalFilters.dateFrom,
    globalFilters.dateTo,
]);



const dotBallData = [
  {
    name: 'Dot',
    value: Number(bowlingStats.dot_balls || 0)
  },
  {
    name: 'Other',
    value: Math.max(
      Number(bowlingStats.legal_balls || 0) -
      Number(bowlingStats.dot_balls || 0),
      0
    )
  }
];

const boundaryRunsData = [
  { name: '1s', value: 45 },
  { name: '2s', value: 18 },
  { name: '3s', value: 4 },
  { name: '4s', value: 38 },
  { name: '5s', value: 2 },
  { name: '6s', value: 22 },
  { name: 'WD', value: 8 },
  { name: 'NB', value: 3 },
  { name: 'LB', value: 6 },
];

const partnershipAverageData = [
  { wicket: '1st', runs: 52 },
  { wicket: '2nd', runs: 44 },
  { wicket: '3rd', runs: 39 },
  { wicket: '4th', runs: 35 },
  { wicket: '5th', runs: 28 },
  { wicket: '6th', runs: 22 },
  { wicket: '7th', runs: 18 },
  { wicket: '8th', runs: 15 },
  { wicket: '9th', runs: 10 },
  { wicket: '10th', runs: 6 },
];


const totalBallsBowled =
  Number(bowlingStats.legal_balls || 0);
const dotBallPercentage =
  totalBallsBowled > 0
    ? (
        Number(bowlingStats.dot_balls) *
        100 /
        totalBallsBowled
      ).toFixed(1)
    : 0;
  async function loadCoreAnalytics() {
    
  try {
    console.log('Selected Home Team:', globalFilters.homeTeam);
    
const data = await getCoreAnalytics({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  match_result: globalFilters.matchResult?.[0],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0], 
  date_from: globalFilters.dateFrom,
date_to: globalFilters.dateTo,
});

    setCoreStats(data);
  } catch (err) {
    console.error(err);
  }
  
} 

const bowlingPhaseData = phaseData;


const extrasPerMatchData = [
  { name: 'Wide', value: Number(bowlingStats.wides) },
  { name: 'No Ball', value: Number(bowlingStats.no_balls) },
  { name: 'Leg Bye', value: Number(bowlingStats.leg_byes) },
];

const wicketsPerMatch = Number(
  bowlingStats.wickets_per_match || 0
).toFixed(1);




const maidenOversPercentage =
  Number(bowlingStats.maiden_overs_pct || 0);
  
const catchesTaken =
  Number(fieldingStats.catches_taken || 0);

const runOutsEffected =
  Number(fieldingStats.runouts_effected || 0);

const byesConcededData = [
  {
    name: 'Byes Conceded',
    value: Number(fieldingStats.byes_conceded || 0)
  },
  {
    name: 'Clean Deliveries',
    value: Math.max(
  Number(bowlingStats.legal_balls || 0) -
  Number(fieldingStats.byes_conceded || 0),
  0
)
  }
];

const byesPercentage =
  Number(bowlingStats.legal_balls || 0) > 0
    ? (
        Number(fieldingStats.byes_conceded || 0) *
        100 /
        Number(bowlingStats.legal_balls || 0)
      ).toFixed(1)
    : 0;

      
  useEffect(() => {
  console.log('HOME AWAY VALUE', globalFilters.homeAway);


getOppositionTeams(globalFilters.homeTeam?.[0])
  .then((r: any) => {
    console.log("API Response:", r);

    setOppositionTeams(
      r.map((x: any) => x.name)
    );
  });

  getVenues({
    home_team_id: globalFilters.homeTeam?.[0],
    home_away: globalFilters.homeAway?.[0]?.toLowerCase()
  })
    .then((r:any) => {
      setVenues(
        r.map((x:any) => x.name)
      );
    })
    .catch(console.error);

}, [
  globalFilters.homeTeam,
  globalFilters.homeAway
]);

  useEffect(() => {
    console.log('TEAM STREAM FILTERS', {
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],

  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0],
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0]
});


getTeamStreams({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  match_result: globalFilters.matchResult?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],

  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
  .then((d) => {

    console.log('TEAM STREAMS', d);

    setBowlingStats(d.bowling_stats);
    setFieldingStats(d.fielding_stats);
    console.log('FRONTEND BOWLING', d.bowling_stats);
    console.log('FRONTEND FIELDING', d.fielding_stats);
    console.log('BOWLING', d.bowling_stats);
    
    console.log('FIELDING', d.fielding_stats);
    setRunRateData(
      d.run_rate_by_over
        .slice(0, 20)
        .map((r) => ({
          over: r.over_number,
          runRate: r.avg_runs
        }))
    );

    setBoundaryData([
      {
        name: 'Fours',
        value: d.boundary_breakdown.fours_count,
        color: '#c41e3a'
      },
      {
        name: 'Sixes',
        value: d.boundary_breakdown.sixes_count,
        color: '#ff4d6d'
      }
    ]);
    const boundaryBalls =
  Number(d.boundary_breakdown.fours_count || 0) +
  Number(d.boundary_breakdown.sixes_count || 0);

const nonBoundaryBalls =
  Math.max(
    Number(bowlingStats.legal_balls || 0) - boundaryBalls,
    0
  );
  

setBoundaryBallsData([
  {
    name: 'Boundary Balls',
    value: d.boundary_breakdown.boundary_balls
  },
  {
    name: 'Non-Boundary Balls',
    value: d.boundary_breakdown.non_boundary_balls
  }
]);

    setPartnershipData(
      d.partnership_maps
        .slice(0, 6)
        .map((p, i) => ({
          partnership: `P${i + 1}`,
          runs: p.runs
        }))
    );

    setEconomyData([
      {
        phase: 'Powerplay',
        economy: d.bowling_economy_by_phase.powerplay,
        wickets: 0
      },
      {
        phase: 'Middle',
        economy: d.bowling_economy_by_phase.middle,
        wickets: 0
      },
      {
        phase: 'Death',
        economy: d.bowling_economy_by_phase.death,
        wickets: 0
      }
    ]);

    setPhaseData([
      {
        phase: 'Powerplay',
        runRate: d.bowling_economy_by_phase.powerplay,
        wickets: d.wickets_by_phase.powerplay
      },
      {
        phase: 'Middle',
        runRate: d.bowling_economy_by_phase.middle,
        wickets: d.wickets_by_phase.middle
      },
      {
        phase: 'Death',
        runRate: d.bowling_economy_by_phase.death,
        wickets: d.wickets_by_phase.death
      }
    ]);

  })
  .catch(() => {});
loadCoreAnalytics();

getRunsPerWicket({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setRunsPerWicketData(
    data.map((item: any) => ({
      wicket: item.wicket,
      runs: Number(item.runs),
    }))
  );
})
.catch(console.error);

getPartnershipAnalysis({
    home_team_id: globalFilters.homeTeam?.[0],
    opposition_team_id: oppositionTeam?.[0],
    venue: venue?.[0],
    over_min: oversRange[0],
    over_max: oversRange[1],
    tournament_id: globalFilters.tournament?.[0],
    home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
    match_result: globalFilters.matchResult?.[0],
    bat_field_first: globalFilters.batFieldFirst?.[0],
    match_type: globalFilters.matchType?.[0],
    date_from: globalFilters.dateFrom,
    date_to: globalFilters.dateTo,
})
.then(setPartnershipAnalysisData);


getRunsStrikeRatePerWicket({
    home_team_id: globalFilters.homeTeam?.[0],
    opposition_team_id: oppositionTeam?.[0],
    venue: venue?.[0],
    over_min: oversRange[0],
    over_max: oversRange[1],
    tournament_id: globalFilters.tournament?.[0],
    home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
    match_result: globalFilters.matchResult?.[0],
    bat_field_first: globalFilters.batFieldFirst?.[0],
    match_type: globalFilters.matchType?.[0],
    date_from: globalFilters.dateFrom,
    date_to: globalFilters.dateTo,
})
.then((data) =>
  setRunsStrikeRatePerWicket(
    data.map((item: any) => ({
      bowler: item.bowler,
      runs: Number(item.runs),
      strike_rate: Number(item.strike_rate),
    }))
  )
)
.catch(console.error);

getTopBowlers({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) =>
  setTopBowlers(
    data.map((b: any) => ({
      bowler: b.bowler,
      wickets: Number(b.wickets),
      economy: Number(b.economy),
    }))
  )
)
.catch(console.error);



getTopBatters({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then(setTopBatters)
.catch(console.error);



getBattingKPIs({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setBattingKPIs(data);
})
.catch(console.error);


getScoreBreakdown({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setBoundaryData([
    {
      name: "1s",
      value: data.runs_from_1s,
      color: "#ffd6de",
    },
    {
      name: "2s",
      value: data.runs_from_2s,
      color: "#ff9bb0",
    },
    {
      name: "4s",
      value: data.runs_from_4s,
      color: "#e60023",
    },
    {
      name: "6s",
      value: data.runs_from_6s,
      color: "#8b0000",
    },
  ]);
})
.catch(console.error);


getShotDistribution({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {

  setShotDistributionData(
    data.map((item) => ({
      name: `${item.shot}s`,
      value: item.count,
      color:
        item.shot === 0 ? "#6B7280" :
        item.shot === 1 ? "#3B82F6" :
        item.shot === 2 ? "#10B981" :
        item.shot === 3 ? "#A855F7" :
        item.shot === 4 ? "#F59E0B" :
        item.shot === 5 ? "#8B5CF6" :
        item.shot === 6 ? "#EF4444" :
        "#14B8A6"
    }))
  );

})
.catch(console.error);



getBowlingScoreBreakdown({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setBowlingBoundaryData([
    {
      name: "1s",
      value: data.runs_from_1s,
      color: "#ffd6de",
    },
    {
      name: "2s",
      value: data.runs_from_2s,
      color: "#ff9bb0",
    },
    {
      name: "4s",
      value: data.runs_from_4s,
      color: "#e60023",
    },
    {
      name: "6s",
      value: data.runs_from_6s,
      color: "#8b0000",
    },
  ]);
})
.catch(console.error);

getBowlingShotDistribution({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setBowlingShotDistributionData(
    data.map((item) => ({
      name: `${item.shot}s`,
      value: item.count,
      color:
        item.shot === 0 ? "#6B7280" :
        item.shot === 1 ? "#3B82F6" :
        item.shot === 2 ? "#10B981" :
        item.shot === 3 ? "#A855F7" :
        item.shot === 4 ? "#F59E0B" :
        item.shot === 5 ? "#8B5CF6" :
        item.shot === 6 ? "#EF4444" :
        "#14B8A6",
    }))
  );
})
.catch(console.error);





getTopCatchTakers({
  home_team_id: globalFilters.homeTeam?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  over_min: oversRange[0],
  over_max: oversRange[1],
  tournament_id: globalFilters.tournament?.[0],
  home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
  match_result: globalFilters.matchResult?.[0],
  bat_field_first: globalFilters.batFieldFirst?.[0],
  match_type: globalFilters.matchType?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
.then((data) => {
  setTopCatchTakers(
    data.map((item: any) => ({
      player: item.player,
      catches: Number(item.catches),
    }))
  );
})
.catch(console.error);

}, [
  oppositionTeam,
  venue,  
  oversRange,
  globalFilters.homeTeam,
  globalFilters.tournament,
  globalFilters.homeAway,
  globalFilters.matchResult,
  globalFilters.batFieldFirst,
  globalFilters.matchType,
  globalFilters.dateFrom,
  globalFilters.dateTo
]);



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



  return (
    <div>
      {/* Team Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Team Filters</h3>
        <div className="flex flex-wrap gap-3">
          <MultiSelectDropdown
          showLabel
            label="Opposition Team"
            options={oppositionTeams}
            selected={oppositionTeam}
            onChange={setOppositionTeam}
            singleSelect
          />
          <MultiSelectDropdown
            label="Venue"
            showLabel
            options={venues}            
            selected={venue}
            onChange={setVenue}
            singleSelect
          />
          <RangeSlider
          
    min={1}
    max={maxOvers}
    value={oversRange}
    onChange={setOversRange}
/>
        </div>
      </div>

      {/* Sub Tabs */}
      
      <div className="flex gap-3 mb-6">
        <button
  onClick={() => setSelectedSubTab('core')}
  className={`px-6 py-2 rounded-full font-medium transition-all ${
    selectedSubTab === 'core'
      ? 'bg-[#e60023] text-white'
      : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
  }`}
>
  Core
</button>
        <button
          onClick={() => setSelectedSubTab('innings')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'innings'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Batting
        </button>
        <button
          onClick={() => setSelectedSubTab('bowling')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'bowling'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Bowling
        </button>
        <button
          onClick={() => setSelectedSubTab('fielding')}          className={`px-6 py-2 rounded-full font-medium transition-all ${
              selectedSubTab === 'fielding'              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Fielding 
        </button>
      </div>
      
      
  {selectedSubTab === 'core' && (
  <div className="space-y-6">
    
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <div className="bg-white rounded-xl p-5 border border-[#e0e0e0]">
    <p className="text-sm text-[#666666]">Matches</p>
    <p className="text-3xl font-bold text-[#1a1a1a]">
      {coreStats.matches_played}
    </p>
  </div>

  <div className="bg-white rounded-xl p-5 border border-[#e0e0e0]">
    <p className="text-sm text-[#666666]">Won</p>
    <p className="text-3xl font-bold text-green-600">
      {coreStats.wins}
    </p>
  </div>

  <div className="bg-white rounded-xl p-5 border border-[#e0e0e0]">
    <p className="text-sm text-[#666666]">Lost</p>
    <p className="text-3xl font-bold text-red-600">
      {coreStats.losses}
    </p>
  </div>

  <div className="bg-white rounded-xl p-5 border border-[#e0e0e0]">
    <p className="text-sm text-[#666666]">Tied</p>
    <p className="text-3xl font-bold text-yellow-500">
      {coreStats.tied}
    </p>
  </div>

  <div className="bg-white rounded-xl p-5 border border-[#e0e0e0]">
    <p className="text-sm text-[#666666]">No Result</p>
    <p className="text-3xl font-bold text-gray-500">
      {coreStats.no_result}
    </p>
  </div>
</div>
  <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-sm text-[#666666] mb-4">Win %</h3>

  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-[#e60023]"
      style={{
        width: `${coreStats.win_percentage}%`,
      }}
    />
  </div>

  <p className="mt-3 text-3xl font-bold text-[#1a1a1a]">
    {coreStats.win_percentage}%
  </p>
</div>

  <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-sm text-[#666666] mb-4">Net Run Rate</h3>

  <div className="flex items-center gap-3">
    <div
      className={`h-4 rounded ${
        Number(coreStats.net_run_rate) >= 0
          ? "bg-green-500"
          : "bg-red-500"
      }`}
      style={{
        width: `${Math.min(
          Math.abs(Number(coreStats.net_run_rate)) * 40,
          200
        )}px`,
      }}
    />

    <span className="text-3xl font-bold text-[#1a1a1a]">
      {coreStats.net_run_rate}
    </span>
  </div>
</div>

  <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-sm text-[#666666] mb-4">Average Batting Score</h3>

  <div className="relative mt-6">
    <div className="h-2 bg-gray-200 rounded-full" />

    <div
      className="absolute -top-2"
      style={{
        left: `${Math.min(
          (Number(coreStats.avg_score) / 300) * 100,
          100
        )}%`,
      }}
    >
      ▲
    </div>
  </div>

  <p className="mt-4 text-3xl font-bold text-[#1a1a1a]">
    {coreStats.avg_score}
  </p>
</div>

  <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-sm text-[#666666] mb-4">Average Score Conceded</h3>

  <div className="relative mt-6">
    <div className="h-2 bg-gray-200 rounded-full" />

    <div
      className="absolute -top-2"
      style={{
        left: `${Math.min(
          (Number(coreStats.avg_conceded) / 300) * 100,
          100
        )}%`,
      }}
    >
      ▲
    </div>
  </div>

  <p className="mt-4 text-3xl font-bold text-[#1a1a1a]">
    {coreStats.avg_conceded}
  </p>
</div>


</div>

)}

      {/* Tab 1: Batting */}
      {selectedSubTab === 'innings' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-6">
    Run Rate
  </h3>

  <div className="flex items-center justify-center h-[220px]">
    <div className="text-center">
      <div className="text-6xl font-bold text-[#E60023]">
        {battingKPIs.run_rate}
      </div>
    </div>
  </div>
</div>

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-6">
    Total Wickets Lost
  </h3>

  <div className="flex items-center justify-center h-[220px]">
    <div className="text-center">
      <div className="text-6xl font-bold text-[#111827]">
        {battingKPIs.wickets_lost}
      </div>
    </div>
  </div>
</div>


    {/* Dot Ball Percentage */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">
          Dot Ball Percentage
        </h3>

        <p className="text-7xl font-bold text-[#e60023]">
          {dotBallPercentage}%
        </p>
      </div>
    </div>

        {/* Partnership Average by Wicket */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold mb-4">
          Runs per Wicket

      </h3>

      <ResponsiveContainer width="100%" height={320}>
  <BarChart data={runsPerWicketData}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
  dataKey="wicket"
  tickFormatter={(value) => {
    const suffix =
      value === 1
        ? "st"
        : value === 2
        ? "nd"
        : value === 3
        ? "rd"
        : "th";

    return `${value}${suffix}`;
  }}
  label={{
    value: "Wicket",
    position: "insideBottom",
    offset: -5,
  }}
/>

    <YAxis
      label={{
        value: "Runs",
        angle: -90,
        position: "insideLeft",
      }}
    />

    <Tooltip />

    <Legend
  verticalAlign="top"
  align="right"
/>

    <Bar
      dataKey="runs"
      name="Runs"
      fill="#e60023"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
    </div>






    {/* Boundary % by Runs */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold mb-4">
        Score Breakdown by Runs
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
  data={boundaryData}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  outerRadius={100}
  paddingAngle={3}
  label
>
  {boundaryData.map((entry, index) => (
    <Cell
      key={index}
      fill={entry.color}
    />
  ))}
</Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Shot Distribution */}
<div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-4">
    Score Breakdown by Balls  </h3>

  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={shotDistributionData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={70}
        outerRadius={110}
        paddingAngle={2}
        label={({ name, value }) =>
  `${name}: ${value}`
}
      >
        {shotDistributionData.map((entry, index) => (
          <Cell
            key={index}
            fill={entry.color}
          />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>


<div className="col-span-2 bg-white rounded-lg border p-4">
    <h3 className="text-sm font-semibold mb-4">
        Top 11 Batters
    </h3>

    <table className="w-full text-sm">
        <thead>
            <tr>
                <th className="text-left">Rank</th>
                <th className="text-left">Batter</th>
                <th className="text-right">Runs</th>
                <th className="text-right">Strike Rate</th>
            </tr>
        </thead>

        <tbody>
  {topBatters.map((b, index) => (
    <tr key={b.batter}>
      <td>{index + 1}</td>
      <td>{b.batter}</td>
      <td className="text-right">{b.runs}</td>
      <td className="text-right">{b.strike_rate}</td>
    </tr>
  ))}
</tbody>
    </table>
</div>

{/* partnership runs and strike rate */}
<div className="col-span-2 bg-white rounded-lg border p-4">
  <h3 className="text-sm font-semibold mb-4">
    Partnership Analysis
  </h3>

  <ResponsiveContainer width="100%" height={350}>
    <ComposedChart data={partnershipAnalysisData}>

      <CartesianGrid strokeDasharray="3 3" />

      <XAxis
  dataKey="partnership"
  label={{
    value: "Wickets",
    position: "insideBottom",
    offset: -5,
  }}
/>

      <YAxis
        yAxisId="left"
        label={{
          value: "Runs",
          angle: -90,
          position: "insideLeft",
        }}
      />

      <YAxis
        yAxisId="right"
        orientation="right"
        label={{
          value: "Strike Rate",
          angle: 90,
          position: "insideRight",
        }}
      />

      <Tooltip />
      <Legend
  verticalAlign="top"
  align="right"
  wrapperStyle={{
    paddingBottom: 20,
    right: 10,
    top: 0,
  }}
/>

      <Bar
        yAxisId="left"
        dataKey="runs"
        fill="#e60023"
        name="Runs"
      />

      <Line
        yAxisId="right"
        dataKey="strike_rate"
        stroke="#2563eb"
        strokeWidth={3}
        name="Strike Rate"
      />

    </ComposedChart>
  </ResponsiveContainer>
</div>


  </div>
)}

      {/* Tab 2: Bowling  */}
      {selectedSubTab === 'bowling' && (
        
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    

    {/* Wickets Per Match */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">
          Wickets Per Match
        </h3>

        <p className="text-7xl font-bold text-[#e60023]">
          {wicketsPerMatch}
        </p>
      </div>
    </div>

    {/* Dot Ball % */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold mb-4">
        Dot Ball %
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={dotBallData}
            dataKey="value"
            innerRadius={60}
            outerRadius={100}
            label
          >
            <Cell fill="#e60023" />
            <Cell fill="#d9d9d9" />
            <Cell fill="#bdbdbd" />
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="text-center mt-3">
        <p className="text-3xl font-bold text-[#e60023]">
          {dotBallPercentage}%
        </p>

        <p className="text-sm text-[#666666]">
          {dotBallData[0].value} Dot Balls out of {totalBallsBowled}
        </p>
      </div>
    </div>


    

    {/* Score Breakdown by Runs */}
<div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-4">
    Score Breakdown by Runs
  </h3>

  <ResponsiveContainer width="100%" height={280}>
    <PieChart>
      <Pie
        data={bowlingBoundaryData}
        dataKey="value"
        nameKey="name"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={3}
        label
      >
        {bowlingBoundaryData.map((entry, index) => (
          <Cell
            key={index}
            fill={entry.color}
          />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>


{/* Score Breakdown by Balls */}
<div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-4">
    Score Breakdown by Balls
  </h3>

  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={bowlingShotDistributionData}
        dataKey="value"
        nameKey="name"
        innerRadius={70}
        outerRadius={110}
        paddingAngle={2}
        label={({ name, value }) => `${name}: ${value}`}
      >
        {bowlingShotDistributionData.map((entry, index) => (
          <Cell
            key={index}
            fill={entry.color}
          />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>


{/* top 11 bowler */}
<div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
  <h3 className="text-lg font-semibold mb-4">
    Top 11 Bowlers
  </h3>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Rank</th>
          <th className="text-left py-2">Bowler</th>
          <th className="text-center py-2">Wickets</th>
          <th className="text-center py-2">Economy</th>
        </tr>
      </thead>

      <tbody>
        {topBowlers.map((row, index) => (
          <tr key={index} className="border-b">
            <td className="py-2">{index + 1}</td>
            <td className="py-2">{row.bowler}</td>
            <td className="py-2 text-center">{row.wickets}</td>
            <td className="py-2 text-center">{row.economy}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


    {/* Maiden Overs % */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">

        <h3 className="text-lg font-semibold mb-6">
          Maiden Overs %
        </h3>

        <div className="relative w-48 h-48 mx-auto">

          <svg
            className="w-48 h-48"
            viewBox="0 0 36 36"
          >
            <path
              d="M18 2.5
                 a 15.5 15.5 0 0 1 0 31
                 a 15.5 15.5 0 0 1 0 -31"
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="2"
            />

            <path
              d="M18 2.5
                 a 15.5 15.5 0 0 1 0 31
                 a 15.5 15.5 0 0 1 0 -31"
              fill="none"
              stroke="#e60023"
              strokeWidth="2"
              strokeDasharray={`${maidenOversPercentage}, 100`}
            />
          </svg>



          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold">
              {maidenOversPercentage}%
            </span>
          </div>

        </div>

      </div>
    </div>


            {/*Runs & Strike Rate per Wicket by bowling */}

<div className="col-span-2 bg-white rounded-xl p-6">

    <h3 className="text-lg font-semibold mb-4">
        Runs & Strike Rate per Wicket
    </h3>

<ResponsiveContainer width="100%" height={500}>
        <ComposedChart
    data={runsStrikeRatePerWicket}
    margin={{
        top: 20,
        right: 30,
        left: 20,
        bottom: 50,
    }}
    barCategoryGap="5%"
    barGap={0}
>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
    dataKey="bowler"
    angle={0}
    textAnchor="middle"
    interval={0}
    height={70}
    label={{
        value: "Bowler",
        position: "insideBottom",
        offset: -10,
    }}
/>

            <YAxis
                yAxisId="left"
                label={{
                    value: "Runs",
                    angle: -90,
                    position: "insideLeft"
                }}
            />

            <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                    value: "Strike Rate",
                    angle: 90,
                    position: "insideRight"
                }}
            />

            <Tooltip />

            <Legend
    layout="horizontal"
    align="right"
    verticalAlign="top"
    wrapperStyle={{
        top: 0,
        right: 20,
    }}
/>

            <Bar
    yAxisId="left"
    dataKey="runs"
    fill="#ef4444"
    barSize={305}
    radius={[4, 4, 0, 0]}
/>

            <Line
    yAxisId="right"
    type="monotone"
    dataKey="strike_rate"
    name="Strike Rate"
    stroke="#2563eb"
    strokeWidth={3}
    dot={{ r: 5 }}
/>

        </ComposedChart>

    </ResponsiveContainer>

</div>

  </div>
  
)}



      {/* Tab 3: Match Impact & Strategy */}
      {selectedSubTab === 'fielding' && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

    {/* Catches Taken */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">
          Catches Taken
        </h3>

        <p className="text-7xl font-bold text-[#e60023]">
          {catchesTaken}
        </p>
      </div>
    </div>

    {/* Run Outs Effected */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">
          Run-outs Effected
        </h3>

        <p className="text-7xl font-bold text-[#e60023]">
          {runOutsEffected}
        </p>
      </div>
    </div>

    {/* Byes Conceded */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold mb-4">
        Byes Conceded
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={byesConcededData}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            label
          >
            <Cell fill="#e60023" />
            <Cell fill="#d9d9d9" />
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="text-center">
        <p className="text-3xl font-bold text-[#e60023]">
          {byesPercentage}%
        </p>

        <p className="text-sm text-[#666666]">
          Byes as % of Balls Received
        </p>
      </div>
    </div>
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] mt-6 col-span-3">
        <h3 className="text-lg font-semibold mb-4">
          Top 10 Catch Takers
        </h3>

        <ResponsiveContainer width="100%" height={350}>
  <BarChart
    data={topCatchTakers}
    margin={{
      top: 20,
      right: 30,
      left: 20,
      bottom: 80,
    }}
  >
    <CartesianGrid strokeDasharray="3 3" />

  <XAxis
  dataKey="player"
  interval={0}
  height={40}
  tickFormatter={(name: string) => {
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  }}
  label={{
    value: "Players",
    position: "insideBottom",
    offset: -5,
  }}
/>

    <YAxis
      allowDecimals={false}
      label={{
        value: "Catches",
        angle: -90,
        position: "insideLeft",
      }}
    />

    <Tooltip />

    <Bar
      dataKey="catches"
      name="Catches"
      fill="#E60023"
      radius={[6, 6, 0, 0]}
    >
      <LabelList
        dataKey="catches"
        position="top"
      />
    </Bar>
  </BarChart>
</ResponsiveContainer>
      </div>

    </div>
  
)}
    </div>
  );
}


// Player Performance Dashboard Component
function PlayerPerformanceDashboard({
  selectedSubTab,
  setSelectedSubTab,
  globalFilters
}: {
  selectedSubTab: string;
  setSelectedSubTab: (tab: string) => void;
  globalFilters: any;
}) {  const [batter, setBatter] = useState<string[]>([]);
  const [batterOptions, setBatterOptions] = useState<string[]>([]);
  const [bowlerOptions, setBowlerOptions] = useState<string[]>([]);
  const [batterStyle, setBatterStyle] = useState<string[]>([]);
const [bowlingExecution, setBowlingExecution] = useState({
    overs_bowled: 0,
    wickets: 0,
    bowling_average: 0,
    economy_rate: 0,
    strike_rate: 0,
    three_fers: 0,
    five_fers: 0,
    best_bowling: "-"
});


const [topBowlers, setTopBowlers] = useState([]);

const [runsStrikeRatePerWicket, setRunsStrikeRatePerWicket] = useState<
{
    bowler: string;
    runs: number;
    strike_rate: number;
}[]
>([]);


const [bowlingChartData, setBowlingChartData] = useState<any>(null);
  const [bowler, setBowler] = useState<string[]>([]);
  const [bowlerType, setBowlerType] = useState<string[]>([]);
  const [bowlerStyle, setBowlerStyle] = useState<string[]>([]);
  const [deliveryLine, setDeliveryLine] = useState<string[]>([]);
  const [deliveryLength, setDeliveryLength] = useState<string[]>([]);
  const [bowlerAction, setBowlerAction] = useState<string[]>([]);
  const [oppositionTeam, setOppositionTeam] = useState<string[]>([]);
  const [venue, setVenue] = useState<string[]>([]);
  const [bowlerTypeOptions, setBowlerTypeOptions] = useState<string[]>([]);
useEffect(() => {
  const homeTeam =
    globalFilters?.homeTeam?.[0];

  if (!homeTeam) {
    setBatterOptions([]);
    return;
  }
  console.log("HOME TEAM", homeTeam);
  console.log("BATTER STYLE", batterStyle);
  getBatters(
    homeTeam,
    batterStyle?.[0]
  )
  .then((data) => {
    const options = data.map(
        (x: any) => x.batter
    );

    setBatterOptions(options);

    // Remove any selected batters that are no longer valid
    setBatter((current) =>
        current.filter((name) => options.includes(name))
    );
})
    .catch(console.error);

}, [
  globalFilters.homeTeam,
  batterStyle
]);





  

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

  const [chartData, setChartData] = useState<any>({
  dot_ball_pct: 0,
  batting_position: [],
  dismissal_types: [],
  phase_runs: []
});

  // Live player aggregations from the nv_play analyst stream.
  const [headToHeadData, setHeadToHeadData] = useState([
    { bowler: 'J. Bumrah', runs: 45, balls: 67, avg: 22.5, sr: 67.2 },
    { bowler: 'P. Cummins', runs: 62, balls: 89, avg: 31, sr: 69.7 },
    { bowler: 'R. Khan', runs: 38, balls: 52, avg: 19, sr: 73.1 },
  ]);
  const [dismissalData, setDismissalData] = useState([
    { name: 'Bowled', value: 28, color: '#c41e3a' },
    { name: 'Caught', value: 42, color: '#ff4d6d' },
    { name: 'LBW', value: 18, color: '#8b0000' },
  ]);
  const [battingStats, setBattingStats] = useState({
  matches: 0,
  innings: 0,
  not_outs: 0,
  runs: 0,
  average: '0',
  strike_rate: '0',
  fifties: 0,
  hundreds: 0,
  highest_score: 0,
});




const BOWLING_DOTBALL_DATA = [
  {
    name: "Dot Balls",
    value: Number(bowlingChartData?.dot_ball_pct || 0)
  },
  {
    name: "Scoring Balls",
    value: 100 - Number(bowlingChartData?.dot_ball_pct || 0)
  }
];

const battingPositionData =
  chartData.batting_position.map((p: any) => ({
    position: p.position,
    runs: Number(p.runs)
  }));
  console.log("chartData", chartData);
  console.log("battingPositionData", battingPositionData);  
  console.log("Batting Position", battingPositionData);

const WICKETS_BY_PHASE_DATA = [
  {
    phase: "Powerplay",
    wickets:
      Number(
        bowlingChartData?.wickets_by_phase?.find(
          (p: any) => p.phase === "Powerplay"
        )?.wickets
      ) || 0,
  },
  {
    phase: "Middle",
    wickets:
      Number(
        bowlingChartData?.wickets_by_phase?.find(
          (p: any) => p.phase === "Middle"
        )?.wickets
      ) || 0,
  },
  {
    phase: "Death",
    wickets:
      Number(
        bowlingChartData?.wickets_by_phase?.find(
          (p: any) => p.phase === "Death"
        )?.wickets
      ) || 0,
  },
];

const HANDEDNESS_DATA = [
  {
    batterType: "Left Handed",
    average: Number(
      bowlingChartData?.handedness?.left?.average ?? 0
    ),
    strikeRate: Number(
      bowlingChartData?.handedness?.left?.strike_rate ?? 0
    ),
  },
  {
    batterType: "Right Handed",
    average: Number(
      bowlingChartData?.handedness?.right?.average ?? 0
    ),
    strikeRate: Number(
      bowlingChartData?.handedness?.right?.strike_rate ?? 0
    ),
  },
];


const BOWLING_COLORS = [
  '#e60023',
  '#ff758f',
  '#ffd6dd',
];

const BATTING_POSITION_DATA = [
  { position: '1', average: 42 },
  { position: '2', average: 55 },
  { position: '3', average: 49 },
  { position: '4', average: 37 },
  { position: '5', average: 31 },
];

const PACE_SPIN_DATA = [
  {
    type: 'Pace',
    average:
      Number(
        chartData.pace_spin?.find(
          (p: any) => p.type === 'Pace'
        )?.average
      ) || 0,
    strikeRate:
      Number(
        chartData.pace_spin?.find(
          (p: any) => p.type === 'Pace'
        )?.strike_rate
      ) || 0,
  },
  {
    type: 'Spin',
    average:
      Number(
        chartData.pace_spin?.find(
          (p: any) => p.type === 'Spin'
        )?.average
      ) || 0,
    strikeRate:
      Number(
        chartData.pace_spin?.find(
          (p: any) => p.type === 'Spin'
        )?.strike_rate
      ) || 0,
  },
];
console.log('PACE_SPIN_DATA', PACE_SPIN_DATA);

const PHASE_SR_DATA =
  chartData.phase_runs.map((p: any) => ({
    phase: p.phase,
    runs: Number(p.runs)
  }));

  const DISMISSAL_COLORS = ['#c41e3a', '#ff4d6d', '#8b0000', '#ff758f', '#ffb3c1', '#666666'];
  const dismissalChartData =
  chartData.dismissal_types.map(
    (d: any, index: number) => ({
      name: d.type,
      value: Number(d.count),
      color:
        DISMISSAL_COLORS[
          index % DISMISSAL_COLORS.length
        ]
    })
  );
  
useEffect(() => {
getBattingExecutionCharts({
  home_team_id: globalFilters.homeTeam?.[0],
  batter: batter?.[0],
  batter_hand: batterStyle?.[0],
  match_type: globalFilters.matchType?.[0],
  
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo
})
.then((data) => {
  setChartData(data);
})
.catch(console.error);

getPlayerStreams({
    home_team_id: globalFilters.homeTeam?.[0],
    opposition_team_id: oppositionTeam?.[0],
    venue: venue?.[0],
    match_type: globalFilters.matchType?.[0],

    home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
    match_result: globalFilters.matchResult?.[0],
    bat_field_first: globalFilters.batFieldFirst?.[0],

    date_from: globalFilters.dateFrom,
    date_to: globalFilters.dateTo
})
    .then((d) => {
      setHeadToHeadData(
        d.head_to_head.slice(0, 8).map((h) => ({
          bowler: h.bowler_name,
          runs: h.runs,
          balls: h.balls,
          avg:
            h.dismissals > 0
              ? Math.round((h.runs / h.dismissals) * 10) / 10
              : h.runs,
          sr:
            h.balls > 0
              ? Math.round((h.runs / h.balls) * 1000) / 10
              : 0,
        }))
      );
      

      setDismissalData(
        d.dismissal_patterns.slice(0, 6).map((p, i) => ({
          name: p.dismissal_type,
          value: p.count,
          color:
            DISMISSAL_COLORS[
              i % DISMISSAL_COLORS.length
            ],
        }))
      );
    })
    .catch(() => {});
}, [
    globalFilters.homeTeam,
    oppositionTeam,
    venue,

    batter,
    batterStyle,

    globalFilters.homeAway,
    globalFilters.tossResult,
    globalFilters.batFieldFirst,

    globalFilters.matchType,

    globalFilters.dateFrom,
    globalFilters.dateTo
]);

useEffect(() => {
  
getBattingExecution({
  home_team_id: globalFilters.homeTeam?.[0],
  batter: batter?.[0],
  batter_hand: batterStyle?.[0],
  match_type: globalFilters.matchType?.[0],
  opposition_team_id: oppositionTeam?.[0],
  venue: venue?.[0],
  date_from: globalFilters.dateFrom,
  date_to: globalFilters.dateTo,
})
    .then(setBattingStats)
    .catch(console.error);
}, [
  globalFilters.homeTeam,
  oppositionTeam,
  venue,
  batter,

  globalFilters.matchType,

  globalFilters.dateFrom,
  globalFilters.dateTo
]);

useEffect(() => {

    const homeTeam =
        globalFilters?.homeTeam?.[0];

    if (!homeTeam) {

        setBowlerTypeOptions([]);

        return;

    }
    console.log("Loading bowler types...");
    console.log("homeTeam =", homeTeam);

    getBowlerTypes(homeTeam)

.then((data: any) => {
    console.log("BOWLER TYPES API:", data);

    const options = data.map((x: any) => x.bowler_type);

    console.log("OPTIONS:", options);

    setBowlerTypeOptions(options);
})

        .catch(console.error);

}, [

    globalFilters.homeTeam

]);

useEffect(() => {

    console.log("===== GET BOWLERS EFFECT STARTED =====");

    const homeTeam = globalFilters?.homeTeam?.[0];

    console.log("homeTeam =", homeTeam);
    console.log("bowlerType =", bowlerType);

    if (!homeTeam) {
        console.log("No home team");
        setBowlerOptions([]);
        return;
    }

    console.log("Calling getBowlers()");

    getBowlers(
        homeTeam,
        bowlerType?.[0],
        bowlerStyle?.[0]

    )
    .then((data:any) => {
        console.log("BOWLERS API RESPONSE", data);

        const options = data.map((x:any)=>x.bowler);

        setBowlerOptions(options);
        console.log("Current bowler =", bowler);
        console.log("Options =", options);

       setBowler(current => {

    console.log("Current =", current);

    console.log(
        "Filtered =",
        current.filter(b => options.includes(b))
    );

    return current.filter(b => options.includes(b));

});
    })
    .catch(err=>{
        console.error("BOWLERS ERROR",err);
    });

},[
    globalFilters.homeTeam,
    bowlerType,
    bowlerStyle

]);

useEffect(() => {
  console.log("Bowling Execution useEffect running");
  console.log("Calling bowling execution API");

    getBowlingExecution({
      

        home_team_id: globalFilters.homeTeam?.[0],

        opposition_team_id: oppositionTeam?.[0],
        match_type: globalFilters.matchType?.[0],
        venue: venue?.[0],
        bowler: bowler?.[0],
        bowler_type: bowlerType?.[0],
        bowler_hand: bowlerStyle?.[0],

        home_away:
            globalFilters.homeAway?.[0]?.toLowerCase(),

        match_result:
            globalFilters.tossResult?.[0],

        bat_field_first:
            globalFilters.batFieldFirst?.[0],

        date_from:
            globalFilters.dateFrom,

        date_to:
            globalFilters.dateTo

    })
    .then(setBowlingExecution)
    .catch(console.error);
    getBowlingExecutionCharts({
    home_team_id: globalFilters.homeTeam?.[0],
    bowler: bowler?.[0],
    bowler_type: bowlerType?.[0],
    bowler_hand: bowlerStyle?.[0],
    opposition_team_id: oppositionTeam?.[0],
    venue: venue?.[0],

    home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
    match_result: globalFilters.matchResult?.[0],
    bat_field_first: globalFilters.batFieldFirst?.[0],

    match_type: globalFilters.matchType?.[0],

    date_from: globalFilters.dateFrom,
    date_to: globalFilters.dateTo
})
.then((data) => {
    console.log("BOWLING CHART DATA");
    console.log(data);
    setBowlingChartData(data);
})
.catch(console.error);

    

}, [

    globalFilters.homeTeam,
    oppositionTeam,
    venue,
    bowler,
    bowlerType,
    bowlerStyle,
    globalFilters.homeAway,
    globalFilters.tossResult,
    globalFilters.batFieldFirst,
    globalFilters.matchType,
    globalFilters.dateFrom,
    globalFilters.dateTo
]);



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
  const FIELDING_EFFICIENCY_DATA = [
  { name: 'Catches', value: 42 },
  { name: 'Drops', value: 8 },
];

const RUNOUT_DATA = [
  { type: 'Direct Hit', count: 12 },
  { type: 'Assisted', count: 18 },
];

const FIELDING_CONTRIBUTION_DATA = [
  { action: 'Catches', count: 42 },
  { action: 'Run-Outs', count: 18 },
  { action: 'Stumpings', count: 7 },
];
console.log("PLAYER PERFORMANCE DASHBOARD RENDERED");

  return (
    <div>
      {/* Player Filters */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-[#e0e0e0]">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Player Filters</h3>
        <div className="flex flex-wrap gap-3">
          <MultiSelectDropdown
          showLabel
            label="Batter"
            options={batterOptions}
            selected={batter}
            onChange={setBatter}
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
            label="Batter Style"
            options={['RHB', 'LHB']}
            selected={batterStyle}
            onChange={setBatterStyle}
            singleSelect
          />
<MultiSelectDropdown
showLabel
    label="Bowler"
    options={bowlerOptions}
    selected={bowler}
    onChange={setBowler}
    singleSelect
/>
         <MultiSelectDropdown
         showLabel
    label="Bowler Type"
    options={bowlerTypeOptions}
    selected={bowlerType}
    onChange={setBowlerType}
    singleSelect
/>
          <MultiSelectDropdown
          showLabel
            label="Bowler Style"
            options={['RHB', 'LHB']}
            selected={bowlerStyle}
            onChange={setBowlerStyle}
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
            label="Delivery Line"
            options={['Outside Off', 'Middle', 'Leg']}
            selected={deliveryLine}
            onChange={setDeliveryLine}
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
            label="Delivery Length"
            options={['Short', 'Good Length', 'Full', 'Yorker']}
            selected={deliveryLength}
            onChange={setDeliveryLength}
            singleSelect
          />
          <MultiSelectDropdown
          showLabel
            label="Bowler Action"
            options={['Over Wicket', 'Around Wicket']}
            selected={bowlerAction}
            onChange={setBowlerAction}
            singleSelect
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
          Fielding Execution
        </button>
      </div>

      {/* Tab 1: Batting Execution */}
      {selectedSubTab === 'batting' && (
  <div className="space-y-6">

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Matches</p>
        <p className="text-3xl font-bold">{battingStats.matches}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Innings</p>
        <p className="text-3xl font-bold">{battingStats.innings}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Not Outs</p>
        <p className="text-3xl font-bold">{battingStats.not_outs}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Runs</p>
        <p className="text-3xl font-bold">{battingStats.runs}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Average</p>
        <p className="text-3xl font-bold">{battingStats.average}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Strike Rate</p>
        <p className="text-3xl font-bold">{battingStats.strike_rate}</p>
      </div>
    </div>

    {/* Milestones */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
        <p className="text-sm text-[#666666]">50s</p>
        <p className="text-5xl font-bold text-[#e60023]">{battingStats.fifties}</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
        <p className="text-sm text-[#666666]">100s</p>
        <p className="text-5xl font-bold text-[#e60023]">{battingStats.hundreds}</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
        <p className="text-sm text-[#666666]">Highest Score</p>
        <p className="text-5xl font-bold text-[#e60023]">{battingStats.highest_score}</p>
      </div>
    </div>

    {/* Charts Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Boundary % */}
      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Dot Ball %
</h3>

<ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={BOWLING_DOTBALL_DATA}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      dataKey="value"
      label
    >
      {BOWLING_DOTBALL_DATA.map((entry, index) => (
        <Cell
          key={index}
          fill={BOWLING_COLORS[index % BOWLING_COLORS.length]}
        />
      ))}
    </Pie>

    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
      </div>

      {/* Batting Position */}
      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Average by Batting Position
</h3>

<ResponsiveContainer width="100%" height={250}>
  <BarChart
    data={battingPositionData}
    layout="vertical"
  >
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis type="number" />

    <YAxis
      dataKey="position"
      type="category"
      width={40}
    />

    <Tooltip />

    <Bar
      dataKey="runs"
      fill="#e60023"
      radius={[0, 6, 6, 0]}
    />
  </BarChart>
</ResponsiveContainer>
      </div>

      {/* Pace vs Spin */}
      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Performance vs Pace vs Spin
</h3>

<ResponsiveContainer width="100%" height={250}>
  <BarChart data={PACE_SPIN_DATA}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis dataKey="type" />

    <YAxis />

    <Tooltip />
    <Legend />

    <Bar
      dataKey="average"
      fill="#e60023"
      name="Average"
      radius={[4, 4, 0, 0]}
    />

    <Bar
  dataKey="strikeRate"
  fill="#ff758f"
  name="Strike Rate"
  radius={[4, 4, 0, 0]}
/>
  </BarChart>
</ResponsiveContainer>

      </div>

      {/* Phase SR */}
      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Phase-wise Strike Rate
</h3>

<ResponsiveContainer width="100%" height={250}>
  <BarChart data={PHASE_SR_DATA}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis dataKey="phase" />

    <YAxis />

    <Tooltip />

    <Bar
      dataKey="runs"
      fill="#e60023"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
      </div>

    </div>

  </div>
)}
      {/* Tab 2: Bowling Execution */}
      {selectedSubTab === 'bowling' && (
        <div className="space-y-6">

  {/* Bowling KPIs */}
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

    <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
      <p className="text-sm text-[#666666]">Overs Bowled</p>
      <p className="text-3xl font-bold">{bowlingExecution?.overs_bowled ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
      <p className="text-sm text-[#666666]">Wickets</p>
      <p className="text-3xl font-bold">{bowlingExecution?.wickets ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
      <p className="text-sm text-[#666666]">Bowling Average</p>
      <p className="text-3xl font-bold">{bowlingExecution?.bowling_average ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
      <p className="text-sm text-[#666666]">Economy Rate</p>
      <p className="text-3xl font-bold">{bowlingExecution?.economy_rate ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
      <p className="text-sm text-[#666666]">Strike Rate</p>
      <p className="text-3xl font-bold">{bowlingExecution?.strike_rate ?? "-"}</p>
    </div>

  </div>

  {/* Milestones */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
      <p className="text-sm text-[#666666]">3-Fers</p>
      <p className="text-5xl font-bold text-[#e60023]">{bowlingExecution?.three_fers ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
      <p className="text-sm text-[#666666]">5-Fers</p>
      <p className="text-5xl font-bold text-[#e60023]">{bowlingExecution?.five_fers ?? "-"}</p>
    </div>

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center">
      <p className="text-sm text-[#666666]">Best Bowling</p>
      <p className="text-5xl font-bold text-[#e60023]">{bowlingExecution?.best_bowling ?? "-"}</p>
    </div>

  </div>

  {/* Charts */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[300px]">
      <h3 className="text-lg font-semibold mb-4">
        Dot Ball %
      </h3>
      <ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={BOWLING_DOTBALL_DATA}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      label
    >
      {BOWLING_DOTBALL_DATA.map((entry, index) => (
        <Cell
          key={`cell-${index}`}
          fill={BOWLING_COLORS[index % BOWLING_COLORS.length]}
        />
      ))}
    </Pie>

    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
    </div>

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[300px]">
      <h3 className="text-lg font-semibold mb-4">
  Wickets by Phase
</h3>

<ResponsiveContainer width="100%" height={250}>
  <BarChart data={WICKETS_BY_PHASE_DATA}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="phase" />
    <YAxis />
    <Tooltip />
    <Bar
      dataKey="wickets"
      fill="#e60023"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
    </div>

    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[300px] lg:col-span-2">
      <h3 className="text-lg font-semibold mb-4">
  Performance vs Left-Handed / Right-Handed Batters
</h3>

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={HANDEDNESS_DATA}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis dataKey="batterType" />
    <YAxis />

    <Tooltip />
    <Legend />

    <Bar
      dataKey="average"
      name="Average"
      fill="#e60023"
      radius={[4, 4, 0, 0]}
    />

    <Bar
      dataKey="strikeRate"
      name="Strike Rate"
      fill="#ff758f"
      radius={[4, 4, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
    </div>

  </div>

</div>
      )}

      {/* Tab 3: Fielding Execution */}
      {selectedSubTab === 'matchups' && (
  <div className="space-y-6">

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Catches</p>
        <p className="text-3xl font-bold">42</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Drops</p>
        <p className="text-3xl font-bold">8</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Catch Efficiency</p>
        <p className="text-3xl font-bold">84%</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Run-Outs</p>
        <p className="text-3xl font-bold">18</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Stumpings</p>
        <p className="text-3xl font-bold">7</p>
      </div>

    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[320px]">
        <h3 className="text-lg font-semibold mb-4">
          Catch Efficiency Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={FIELDING_EFFICIENCY_DATA}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      label
    >
      {FIELDING_EFFICIENCY_DATA.map((entry, index) => (
        <Cell
          key={index}
          fill={
            index === 0
              ? '#e60023'
              : '#ff758f'
          }
        />
      ))}
    </Pie>

    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[320px]">
        <h3 className="text-lg font-semibold mb-4">
          Run-Out Analysis
        </h3>
        <ResponsiveContainer width="100%" height={250}>
  <BarChart data={RUNOUT_DATA}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="type" />
    <YAxis />
    <Tooltip />

    <Bar
      dataKey="count"
      fill="#e60023"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] min-h-[320px] lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">
          Fielding Contributions
        </h3>
        <ResponsiveContainer width="100%" height={300}>
  <BarChart
    data={FIELDING_CONTRIBUTION_DATA}
    layout="vertical"
  >
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis type="number" />

    <YAxis
      dataKey="action"
      type="category"
      width={100}
    />

    <Tooltip />

    <Bar
      dataKey="count"
      fill="#e60023"
      radius={[0, 6, 6, 0]}
    />
  </BarChart>
</ResponsiveContainer>
      </div>

    </div>

  </div>
)}
    </div>
  );
}

// Tournament Performance Dashboard Component
function TournamentPerformanceDashboard({
  selectedSubTab,
  setSelectedSubTab,
  globalFilters
}: {
  selectedSubTab: string;
  setSelectedSubTab: (tab: string) => void;
  globalFilters: any;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');


  // Live tournament aggregations from the nv_play analyst stream.
  const [pointsTableData, setPointsTableData] = useState([
    { team: 'India', m: 14, w: 10, l: 4, pts: 20, nrr: 1.25, winPct: 71.4 },
    { team: 'Australia', m: 14, w: 9, l: 5, pts: 18, nrr: 0.85, winPct: 64.3 },
    { team: 'England', m: 14, w: 8, l: 6, pts: 16, nrr: 0.45, winPct: 57.1 },
  ]);

const [qualificationData, setQualificationData] = useState<any[]>([]);
  const runRateComparisonData = [
    { match: 'M1', runRate: 8.5 },
    { match: 'M2', runRate: 7.2 },
    { match: 'M3', runRate: 9.8 },
    { match: 'M4', runRate: 6.9 },
    { match: 'M5', runRate: 8.7 },
  ];

  const [topRunScorers, setTopRunScorers] = useState([
    { player: 'Virat Kohli', runs: 892, avg: 62.3, sr: 142.5 },
    { player: 'Rohit Sharma', runs: 845, avg: 58.2, sr: 138.8 },
    { player: 'Steve Smith', runs: 778, avg: 54.1, sr: 128.4 },
  ]);
  const [topWicketTakers, setTopWicketTakers] = useState([
    { player: 'J. Bumrah', wickets: 24, avg: 18.5, econ: 6.8 },
    { player: 'P. Cummins', wickets: 22, avg: 19.8, econ: 7.2 },
    { player: 'R. Khan', wickets: 21, avg: 17.2, econ: 6.5 },
  ]);

  const selectedTeamStats =
  pointsTableData.find(
    t => t.team === globalFilters.homeTeam?.[0]
  );

const selectedTeamPosition =
  pointsTableData.findIndex(
    t => t.team === globalFilters.homeTeam?.[0]
  ) + 1;

  const selectedQualification =
  qualificationData.find(
    (q) => q.team === globalFilters.homeTeam?.[0]
  );


const WIN_LOSS_DATA = selectedTeamStats
  ? [
      {
        name: "Won",
        value: selectedTeamStats.w,
      },
      {
        name: "Lost",
        value: selectedTeamStats.l,
      },
      {
        name: "NR",
        value:
          selectedTeamStats.m -
          selectedTeamStats.w -
          selectedTeamStats.l,
      },
    ]
  : [];
  
const QUALIFICATION_DATA = selectedQualification
  ? [
      {
        name: "Qualified",
        value: selectedQualification.qualification_probability,
      },
      {
        name: "Remaining",
        value: selectedQualification.remaining_probability,
      },
    ]
  : [];

const STAGE_COMPARISON_DATA = [
  {
    stage: 'Group',
    winRate: 71,
    runRate: 8.4,
    avgScore: 172,
  },
  {
    stage: 'Knockout',
    winRate: 67,
    runRate: 8.1,
    avgScore: 165,
  },
];

const ROUND_PERFORMANCE_DATA = [
  { round: 'League', winPct: 71 },
  { round: 'Qualifier 1', winPct: 100 },
  { round: 'Eliminator', winPct: 50 },
  { round: 'Qualifier 2', winPct: 100 },
  { round: 'Final', winPct: 100 },
];

const OPPONENT_RECORD_DATA = [
  { opponent: 'Mumbai Indians', wins: 8, losses: 3 },
  { opponent: 'Chennai Super Kings', wins: 5, losses: 6 },
  { opponent: 'Royal Challengers', wins: 7, losses: 4 },
  { opponent: 'Kolkata Knight Riders', wins: 6, losses: 2 },
  { opponent: 'Delhi Capitals', wins: 9, losses: 1 },
];

const MARGIN_TRENDS_DATA = [
  { opponent: 'Mumbai Indians', margin: 42 },
  { opponent: 'Chennai Super Kings', margin: -18 },
  { opponent: 'Royal Challengers', margin: 31 },
  { opponent: 'Kolkata Knight Riders', margin: 15 },
  { opponent: 'Delhi Capitals', margin: 58 },
];

useEffect(() => {
  getTournamentStreams({
    home_away: globalFilters.homeAway?.[0]?.toLowerCase(),
    home_team_id: globalFilters.homeTeam?.[0],
    tournament_id: globalFilters.tournament?.[0],
    match_type: globalFilters.matchType?.[0],
    date_from: globalFilters.dateFrom,
    date_to: globalFilters.dateTo,
  })

      .then((d) => {
        setQualificationData(d.qualification);
        setPointsTableData(d.points_table.slice(0, 12).map((t) => ({
          team: t.team, m: t.played, w: t.won, l: t.lost, pts: t.points, nrr: t.nrr,
          winPct: t.played > 0 ? Math.round((t.won / t.played) * 1000) / 10 : 0,
        })));
        setTopRunScorers(d.top_scorers.slice(0, 10).map((s) => ({
          player: s.player_name, runs: s.runs, avg: s.average, sr: 0,
        })));
        setTopWicketTakers(d.top_wicket_takers.slice(0, 10).map((w) => ({
          player: w.player_name, wickets: w.wickets, avg: 0, econ: w.economy,
        })));



      

})
      
    .catch(console.error);

}, [
  globalFilters.homeAway,
  globalFilters.homeTeam,
  globalFilters.tournament,
  globalFilters.matchType,
  globalFilters.dateFrom,
  globalFilters.dateTo
]);

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

  const BOUNDARY_LEADERS_DATA = [
  { player: 'Player A', sixes: 48, fours: 73 },
  { player: 'Player B', sixes: 42, fours: 66 },
  { player: 'Player C', sixes: 37, fours: 61 },
  { player: 'Player D', sixes: 33, fours: 58 },
];
<button
  onClick={() => setSelectedSubTab('opposition')}
  className={`px-6 py-2 rounded-full font-medium transition-all ${
    selectedSubTab === 'opposition'
      ? 'bg-[#e60023] text-white'
      : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
  }`}
>
  Opposition Breakdown
</button>



  return (
    <div>
      {/* Tournament Filters */}
      

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
          Core
        </button>
        <button
          onClick={() => setSelectedSubTab('performers')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'performers'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Tournament-Specific Stats
        </button>
        <button
          onClick={() => setSelectedSubTab('conditions')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedSubTab === 'conditions'
              ? 'bg-[#e60023] text-white'
              : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
          }`}
        >
          Stage-Wise Performance
        </button>
        <button
  onClick={() => setSelectedSubTab('opposition')}
  className={`px-6 py-2 rounded-full font-medium transition-all ${
    selectedSubTab === 'opposition'
      ? 'bg-[#e60023] text-white'
      : 'bg-white text-[#666666] hover:bg-[#f5f5f5] border border-[#e0e0e0]'
  }`}
>
  Opposition Breakdown
</button>
      </div>

      {/* Tab 1: Core */}
      {selectedSubTab === 'standings' && (
  <div className="space-y-6">

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Position</p>
        <p className="text-3xl font-bold">
  {selectedTeamPosition || "-"}
</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Played</p>
        <p className="text-3xl font-bold">
  {selectedTeamStats?.m ?? 0}
</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Won</p>
        <p className="text-3xl font-bold">
  {selectedTeamStats?.w ?? 0}
</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Lost</p>
        <p className="text-3xl font-bold">
  {selectedTeamStats?.l ?? 0}
</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">NRR</p>
        <p className="text-3xl font-bold">
  {selectedTeamStats?.nrr ?? 0}
</p>  
      </div>

    </div>

    {/* Tournament Standings */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold mb-4">
        Tournament Standings
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e0e0e0]">
            <th className="text-left py-2">Pos</th>
            <th className="text-left py-2">Team</th>
            <th className="text-center py-2">P</th>
            <th className="text-center py-2">W</th>
            <th className="text-center py-2">L</th>
            <th className="text-center py-2">Pts</th>
            <th className="text-center py-2">NRR</th>
          </tr>
        </thead>

        <tbody>
          {pointsTableData.map((team, index) => (
            <tr key={team.team}>
            <td>{index + 1}</td>
            <td>{team.team}</td>
            <td className="text-center">{team.m}</td>
            <td className="text-center">{team.w}</td>
            <td className="text-center">{team.l}</td>
            <td className="text-center">{team.pts}</td>
            <td className="text-center">{team.nrr}</td>
          </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Tournament Record
</h3>

<ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={WIN_LOSS_DATA}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      label
    >
      <Cell fill="#e60023" />
      <Cell fill="#ff758f" />
      <Cell fill="#ffd6dd" />
    </Pie>

    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
  Qualification Probability
</h3>

<ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={QUALIFICATION_DATA}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      label
    >
      <Cell fill="#e60023" />
      <Cell fill="#e0e0e0" />
    </Pie>

    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>

<div className="text-center mt-2">
  <span className="text-3xl font-bold text-[#e60023]">
    {selectedQualification?.qualification_probability ?? 0}%
  </span>
</div>
      </div>

    </div>

  </div>
  )}

      {/* Tab 2: Tournament-Specific Stats */}
      {selectedSubTab === 'performers' && (
  <div className="space-y-6">

    {/* Top Scorers & Wicket Takers */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Top Run Scorer (Club)</p>
        <p className="text-2xl font-bold">{topRunScorers[0]?.runs ?? 0}</p>
        <p className="text-sm text-[#666666]">{topRunScorers[0]?.player ?? "-"}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Top Run Scorer (Tournament)</p>
        <p className="text-2xl font-bold">715</p>
        <p className="text-sm text-[#666666]">Jos Buttler</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Top Wicket Taker (Club)</p>
        <p className="text-2xl font-bold">{topWicketTakers[0]?.wickets ?? 0}</p>
        <p className="text-sm text-[#666666]">{topWicketTakers[0]?.player ?? "-"}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Top Wicket Taker (Tournament)</p>
        <p className="text-2xl font-bold">31</p>
        <p className="text-sm text-[#666666]">Kagiso Rabada</p>
      </div>

    </div>

    {/* Tournament Records */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Highest Team Total</p>
        <p className="text-3xl font-bold">248/4</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Lowest Total Defended</p>
        <p className="text-3xl font-bold">121</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Most Sixes</p>
        <p className="text-3xl font-bold">48</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
        <p className="text-sm text-[#666666]">Most Fours</p>
        <p className="text-3xl font-bold">73</p>
      </div>

    </div>

    {/* Boundary Leaders */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">

      <h3 className="text-lg font-semibold mb-4">
        Boundary Leaders
      </h3>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={BOUNDARY_LEADERS_DATA}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis type="number" />

          <YAxis
            type="category"
            dataKey="player"
            width={90}
          />

          <Tooltip />
          <Legend />

          <Bar
            dataKey="sixes"
            fill="#e60023"
            name="Sixes"
            radius={[0, 6, 6, 0]}
          />

          <Bar
            dataKey="fours"
            fill="#ff758f"
            name="Fours"
            radius={[0, 6, 6, 0]}
          />

        </BarChart>
      </ResponsiveContainer>

    </div>

    {/* Best Performances */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
          Best Batting Figure
        </h3>

        <p className="text-5xl font-bold text-[#e60023]">
          142*
        </p>

        <p className="mt-2 text-[#666666]">
          68 Balls
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
        <h3 className="text-lg font-semibold mb-4">
          Best Bowling Figure
        </h3>

        <p className="text-5xl font-bold text-[#e60023]">
          6/18
        </p>

        <p className="mt-2 text-[#666666]">
          Match Winning Spell
        </p>
      </div>

    </div>

  </div>
  )}

      {/* Tab 3: Stage-Wise Performance */}
      {selectedSubTab === 'conditions' && (
  <div className="space-y-6">

    {/* Group Stage vs Knockout */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">

      <h3 className="text-lg font-semibold mb-4">
        Group Stage vs Knockout Performance
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={STAGE_COMPARISON_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip />
          <Legend />

          <Bar
            dataKey="winRate"
            fill="#e60023"
            name="Win %"
          />

          <Bar
            dataKey="avgScore"
            fill="#ff758f"
            name="Average Score"
          />
        </BarChart>
      </ResponsiveContainer>

    </div>

    {/* Performance by Round */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">

      <h3 className="text-lg font-semibold mb-4">
        Performance by Round
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={ROUND_PERFORMANCE_DATA}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis type="number" />

          <YAxis
            dataKey="round"
            type="category"
            width={100}
          />

          <Tooltip />

          <Bar
            dataKey="winPct"
            fill="#e60023"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

    </div>

  </div>
  )}
  
  {/* Tab 4: Opposition Breakdown */}
{selectedSubTab === 'opposition' && (
  <div className="space-y-6">

    {/* Win/Loss Record vs Opponents */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">
        Win/Loss Record vs Opponents
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={OPPONENT_RECORD_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="opponent" />
          <YAxis />
          <Tooltip />
          <Legend />

          <Bar
            dataKey="wins"
            name="Wins"
            fill="#e60023"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="losses"
            name="Losses"
            fill="#ffb3c1"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Margin Trends */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">
        Average Margin vs Opponents
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={MARGIN_TRENDS_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="opponent" />
          <YAxis />
          <Tooltip />

          <Bar
            dataKey="margin"
            fill="#e60023"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-sm text-[#666666] mt-3">
        Positive values indicate average winning margin. Negative values indicate average losing margin.
      </p>
    </div>

    {/* Record Table */}
    <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">
        Opposition Summary
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e0e0e0]">
              <th className="text-left py-3 px-4">Opponent</th>
              <th className="text-center py-3 px-4">Wins</th>
              <th className="text-center py-3 px-4">Losses</th>
              <th className="text-center py-3 px-4">Win %</th>
            </tr>
          </thead>

          <tbody>
            {OPPONENT_RECORD_DATA.map((team) => {
              const total = team.wins + team.losses;
              const winPct = ((team.wins / total) * 100).toFixed(1);

              return (
                <tr
                  key={team.opponent}
                  className="border-b border-[#f0f0f0]"
                >
                  <td className="py-3 px-4">{team.opponent}</td>

                  <td className="text-center py-3 px-4">
                    {team.wins}
                  </td>

                  <td className="text-center py-3 px-4">
                    {team.losses}
                  </td>

                  <td className="text-center py-3 px-4 font-medium text-[#e60023]">
                    {winPct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
