// Cricket Mock Data for CricketHub

export interface Player {
  id: string;
  name: string;
  team: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  avatar?: string;
  matches: number;
  runs: number;
  wickets: number;
  battingAvg: number;
  bowlingAvg: number;
  strikeRate: number;
  economy: number;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  competition: string;
  playerCount: number;
  matchCount: number;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  opponent: string;
  venue: string;
  date: string;
  format: 'T20' | 'ODI' | 'Test';
  status: 'Won' | 'Lost' | 'Scheduled' | 'In Progress';
  result?: string;
  teamAScore?: string;
  teamBScore?: string;
  competition: string;
}

export interface DashboardKPI {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

// Mock Players
export const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Virat Kohli',
    team: 'Royal Challengers',
    role: 'Batsman',
    matches: 245,
    runs: 8456,
    wickets: 4,
    battingAvg: 51.2,
    bowlingAvg: 42.5,
    strikeRate: 138.4,
    economy: 8.2,
  },
  {
    id: '2',
    name: 'Jasprit Bumrah',
    team: 'Mumbai Indians',
    role: 'Bowler',
    matches: 178,
    runs: 342,
    wickets: 267,
    battingAvg: 12.4,
    bowlingAvg: 21.3,
    strikeRate: 95.2,
    economy: 6.8,
  },
  {
    id: '3',
    name: 'Ravindra Jadeja',
    team: 'Chennai Super Kings',
    role: 'All-rounder',
    matches: 198,
    runs: 3542,
    wickets: 156,
    battingAvg: 28.7,
    bowlingAvg: 26.4,
    strikeRate: 126.5,
    economy: 7.4,
  },
  {
    id: '4',
    name: 'MS Dhoni',
    team: 'Chennai Super Kings',
    role: 'Wicket-keeper',
    matches: 298,
    runs: 6728,
    wickets: 0,
    battingAvg: 38.9,
    bowlingAvg: 0,
    strikeRate: 142.8,
    economy: 0,
  },
  {
    id: '5',
    name: 'Rohit Sharma',
    team: 'Mumbai Indians',
    role: 'Batsman',
    matches: 267,
    runs: 7845,
    wickets: 18,
    battingAvg: 46.3,
    bowlingAvg: 38.2,
    strikeRate: 134.6,
    economy: 8.5,
  },
  {
    id: '6',
    name: 'Pat Cummins',
    team: 'Kolkata Knight Riders',
    role: 'Bowler',
    matches: 112,
    runs: 567,
    wickets: 145,
    battingAvg: 15.2,
    bowlingAvg: 23.1,
    strikeRate: 98.4,
    economy: 7.2,
  },
  {
    id: '7',
    name: 'Ben Stokes',
    team: 'Rajasthan Royals',
    role: 'All-rounder',
    matches: 156,
    runs: 4234,
    wickets: 98,
    battingAvg: 32.5,
    bowlingAvg: 28.9,
    strikeRate: 145.2,
    economy: 8.1,
  },
  {
    id: '8',
    name: 'KL Rahul',
    team: 'Lucknow Super Giants',
    role: 'Wicket-keeper',
    matches: 189,
    runs: 5678,
    wickets: 0,
    battingAvg: 44.8,
    bowlingAvg: 0,
    strikeRate: 136.9,
    economy: 0,
  },
];

// Mock Teams
export const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Mumbai Indians',
    competition: 'IPL 2024',
    playerCount: 25,
    matchCount: 14,
    wins: 9,
    losses: 5,
  },
  {
    id: '2',
    name: 'Chennai Super Kings',
    competition: 'IPL 2024',
    playerCount: 24,
    matchCount: 14,
    wins: 10,
    losses: 4,
  },
  {
    id: '3',
    name: 'Royal Challengers',
    competition: 'IPL 2024',
    playerCount: 23,
    matchCount: 14,
    wins: 7,
    losses: 7,
  },
  {
    id: '4',
    name: 'Kolkata Knight Riders',
    competition: 'IPL 2024',
    playerCount: 25,
    matchCount: 14,
    wins: 8,
    losses: 6,
  },
  {
    id: '5',
    name: 'Rajasthan Royals',
    competition: 'IPL 2024',
    playerCount: 24,
    matchCount: 14,
    wins: 6,
    losses: 8,
  },
  {
    id: '6',
    name: 'Lucknow Super Giants',
    competition: 'IPL 2024',
    playerCount: 22,
    matchCount: 14,
    wins: 5,
    losses: 9,
  },
];

// Mock Matches
export const mockMatches: Match[] = [
  {
    id: '1',
    teamA: 'Mumbai Indians',
    teamB: 'Chennai Super Kings',
    opponent: 'Chennai Super Kings',
    venue: 'Wankhede Stadium, Mumbai',
    date: '2024-05-15',
    format: 'T20',
    status: 'Won',
    result: 'Won by 6 wickets',
    teamAScore: '186/4 (19.2)',
    teamBScore: '182/7 (20)',
    competition: 'IPL 2024',
  },
  {
    id: '2',
    teamA: 'Royal Challengers',
    teamB: 'Mumbai Indians',
    opponent: 'Royal Challengers',
    venue: 'M. Chinnaswamy Stadium, Bangalore',
    date: '2024-05-18',
    format: 'T20',
    status: 'Lost',
    result: 'Lost by 23 runs',
    teamAScore: '178/8 (20)',
    teamBScore: '155/9 (20)',
    competition: 'IPL 2024',
  },
  {
    id: '3',
    teamA: 'Mumbai Indians',
    teamB: 'Kolkata Knight Riders',
    opponent: 'Kolkata Knight Riders',
    venue: 'Wankhede Stadium, Mumbai',
    date: '2024-05-22',
    format: 'T20',
    status: 'Won',
    result: 'Won by 31 runs',
    teamAScore: '195/6 (20)',
    teamBScore: '164/8 (20)',
    competition: 'IPL 2024',
  },
  {
    id: '4',
    teamA: 'Rajasthan Royals',
    teamB: 'Mumbai Indians',
    opponent: 'Rajasthan Royals',
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2024-05-25',
    format: 'T20',
    status: 'Scheduled',
    competition: 'IPL 2024',
  },
  {
    id: '5',
    teamA: 'Mumbai Indians',
    teamB: 'Lucknow Super Giants',
    opponent: 'Lucknow Super Giants',
    venue: 'Wankhede Stadium, Mumbai',
    date: '2024-05-28',
    format: 'T20',
    status: 'Scheduled',
    competition: 'IPL 2024',
  },
];

// Dashboard KPIs
export const dashboardKPIs: DashboardKPI[] = [
  { label: 'Upcoming Matches', value: 2, trend: 'neutral' },
  { label: 'Win Rate', value: '64.3%', change: '+5.2%', trend: 'up' },
  { label: 'Avg Score', value: 178, change: '+12', trend: 'up' },
  { label: 'Avg Wickets', value: 6.8, change: '-0.3', trend: 'down' },
  { label: 'Recent Form', value: 'W-W-L-W-W', trend: 'up' },
];

// Run rate data for charts
export const runRateData = [
  { match: 'M1', runRate: 8.2 },
  { match: 'M2', runRate: 7.8 },
  { match: 'M3', runRate: 9.1 },
  { match: 'M4', runRate: 8.5 },
  { match: 'M5', runRate: 7.5 },
  { match: 'M6', runRate: 9.8 },
  { match: 'M7', runRate: 8.9 },
  { match: 'M8', runRate: 9.2 },
];

// Player performance data
export const playerRunsData = [
  { match: 'M1', runs: 45 },
  { match: 'M2', runs: 67 },
  { match: 'M3', runs: 23 },
  { match: 'M4', runs: 89 },
  { match: 'M5', runs: 12 },
  { match: 'M6', runs: 56 },
  { match: 'M7', runs: 78 },
  { match: 'M8', runs: 34 },
];

export const playerWicketsData = [
  { match: 'M1', wickets: 2 },
  { match: 'M2', wickets: 3 },
  { match: 'M3', wickets: 1 },
  { match: 'M4', wickets: 4 },
  { match: 'M5', wickets: 2 },
  { match: 'M6', wickets: 3 },
  { match: 'M7', wickets: 1 },
  { match: 'M8', wickets: 2 },
];
