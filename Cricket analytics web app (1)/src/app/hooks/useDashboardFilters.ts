import { useState, useCallback, useMemo } from 'react';

// Types
export interface FilterState {
  // Global Filters
  tournament: string[];
  homeTeam: string[];
  oppositionTeam: string[];
  venue: string[];
  matchType: string[];
  homeAway: string[];
  tossResult: string[];
  batFieldFirst: string[];

  // Team Filters
  oversRange: [number, number];

  // Player Filters
  batter: string[];
  batterStyle: string[];
  bowler: string[];
  bowlerType: string[];
  bowlerStyle: string[];
  deliveryLine: string[];
  deliveryLength: string[];
  bowlerAction: string[];

  // Tournament Filters
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Mock data structures
interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  teams: string[];
  venues: string[];
  matchType: string; // Single match type per tournament
}

interface Player {
  id: string;
  name: string;
  batterStyle?: 'RHB' | 'LHB';
  bowlerStyle?: 'Right-arm' | 'Left-arm';
  bowlerType?: 'Spin' | 'Pace' | 'Medium Pace';
}

interface TeamStats {
  team: string;
  tossWon: number;
  tossLost: number;
  batFirst: number;
  fieldFirst: number;
}

interface VenueHistory {
  venue: string;
  homeTeam: string;
  oppositionTeam: string;
  matchCount: number;
}

// Mock tournaments data
const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'IPL 2024',
    startDate: '2024-03-22',
    endDate: '2024-05-26',
    teams: ['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers', 'Kolkata Knight Riders'],
    venues: ['Wankhede Stadium', 'M.A. Chidambaram Stadium', 'M. Chinnaswamy Stadium', 'Eden Gardens'],
    matchType: 'T20',
  },
  {
    id: '2',
    name: 'T20 World Cup 2024',
    startDate: '2024-06-01',
    endDate: '2024-06-29',
    teams: ['India', 'Australia', 'England', 'Pakistan', 'New Zealand', 'South Africa'],
    venues: ['Eden Gardens', 'Wankhede Stadium', 'Feroz Shah Kotla', 'The Oval'],
    matchType: 'T20',
  },
  {
    id: '3',
    name: 'ODI World Cup 2023',
    startDate: '2023-10-05',
    endDate: '2023-11-19',
    teams: ['India', 'Australia', 'England', 'Pakistan', 'New Zealand', 'South Africa', 'Bangladesh', 'Sri Lanka'],
    venues: ['Wankhede Stadium', 'Eden Gardens', 'M. Chinnaswamy Stadium', 'Narendra Modi Stadium'],
    matchType: '50 Overs',
  },
];

// Mock players data
const mockPlayers: Player[] = [
  { id: '1', name: 'Virat Kohli', batterStyle: 'RHB', bowlerType: 'Medium Pace', bowlerStyle: 'Right-arm' },
  { id: '2', name: 'Rohit Sharma', batterStyle: 'RHB', bowlerType: 'Medium Pace', bowlerStyle: 'Right-arm' },
  { id: '3', name: 'Rishabh Pant', batterStyle: 'LHB' },
  { id: '4', name: 'David Warner', batterStyle: 'LHB' },
  { id: '5', name: 'Shikhar Dhawan', batterStyle: 'LHB' },
  { id: '6', name: 'Jasprit Bumrah', bowlerType: 'Pace', bowlerStyle: 'Right-arm' },
  { id: '7', name: 'Mohammed Shami', bowlerType: 'Pace', bowlerStyle: 'Right-arm' },
  { id: '8', name: 'Ravindra Jadeja', batterStyle: 'LHB', bowlerType: 'Spin', bowlerStyle: 'Left-arm' },
  { id: '9', name: 'Yuzvendra Chahal', bowlerType: 'Spin', bowlerStyle: 'Right-arm' },
  { id: '10', name: 'Kuldeep Yadav', bowlerType: 'Spin', bowlerStyle: 'Left-arm' },
  { id: '11', name: 'Mitchell Starc', bowlerType: 'Pace', bowlerStyle: 'Left-arm' },
  { id: '12', name: 'Pat Cummins', bowlerType: 'Pace', bowlerStyle: 'Right-arm' },
  { id: '13', name: 'Rashid Khan', bowlerType: 'Spin', bowlerStyle: 'Right-arm' },
  { id: '14', name: 'Hardik Pandya', batterStyle: 'RHB', bowlerType: 'Medium Pace', bowlerStyle: 'Right-arm' },
  { id: '15', name: 'Ben Stokes', batterStyle: 'LHB', bowlerType: 'Medium Pace', bowlerStyle: 'Right-arm' },
];

// Mock team stats
const mockTeamStats: TeamStats[] = [
  { team: 'Mumbai Indians', tossWon: 8, tossLost: 6, batFirst: 7, fieldFirst: 7 },
  { team: 'Chennai Super Kings', tossWon: 9, tossLost: 5, batFirst: 8, fieldFirst: 6 },
  { team: 'Royal Challengers', tossWon: 6, tossLost: 8, batFirst: 6, fieldFirst: 8 },
  { team: 'India', tossWon: 12, tossLost: 8, batFirst: 11, fieldFirst: 9 },
  { team: 'Australia', tossWon: 10, tossLost: 10, batFirst: 10, fieldFirst: 10 },
];

// Mock venue history
const mockVenueHistory: VenueHistory[] = [
  { venue: 'Wankhede Stadium', homeTeam: 'Mumbai Indians', oppositionTeam: 'Chennai Super Kings', matchCount: 5 },
  { venue: 'M.A. Chidambaram Stadium', homeTeam: 'Chennai Super Kings', oppositionTeam: 'Mumbai Indians', matchCount: 4 },
  { venue: 'Eden Gardens', homeTeam: 'Kolkata Knight Riders', oppositionTeam: 'Mumbai Indians', matchCount: 3 },
  { venue: 'The Oval', homeTeam: 'India', oppositionTeam: 'England', matchCount: 7 },
  { venue: 'Wankhede Stadium', homeTeam: 'India', oppositionTeam: 'Australia', matchCount: 6 },
];

export function useDashboardFilters() {
  const [filters, setFilters] = useState<FilterState>({
    tournament: [],
    homeTeam: [],
    oppositionTeam: [],
    venue: [],
    matchType: [],
    homeAway: [],
    tossResult: [],
    batFieldFirst: [],
    oversRange: [1, 20],
    batter: [],
    batterStyle: [],
    bowler: [],
    bowlerType: [],
    bowlerStyle: [],
    deliveryLine: [],
    deliveryLength: [],
    bowlerAction: [],
    dateRange: { startDate: '', endDate: '' },
  });

  // CHANGE 2.1: Tournament Cascades - Get tournament-specific data
  const selectedTournamentData = useMemo(() => {
    if (filters.tournament.length === 0) return null;
    return mockTournaments.find(t => filters.tournament.includes(t.name));
  }, [filters.tournament]);

  // Available teams based on tournament
  const availableTeams = useMemo(() => {
    if (!selectedTournamentData) {
      return ['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers', 'Kolkata Knight Riders', 'India', 'Australia', 'England'];
    }
    return selectedTournamentData.teams;
  }, [selectedTournamentData]);

  // Available venues based on tournament
  const availableVenues = useMemo(() => {
    if (!selectedTournamentData) {
      return ['Wankhede Stadium', 'Eden Gardens', 'M. Chinnaswamy Stadium', 'The Oval'];
    }
    return selectedTournamentData.venues;
  }, [selectedTournamentData]);

  // CHANGE 2.1: Auto-locked match type from tournament
  const lockedMatchType = useMemo(() => {
    return selectedTournamentData?.matchType || null;
  }, [selectedTournamentData]);

  // CHANGE 2.2: Home team options (excluding opposition teams)
  const homeTeamOptions = useMemo(() => {
    return availableTeams.filter(team => !filters.oppositionTeam.includes(team));
  }, [availableTeams, filters.oppositionTeam]);

  // CHANGE 2.2: Opposition team options (excluding home teams)
  const oppositionTeamOptions = useMemo(() => {
    return availableTeams.filter(team => !filters.homeTeam.includes(team));
  }, [availableTeams, filters.homeTeam]);

  // CHANGE 2.2: Toss result with counts
  const tossResultCounts = useMemo(() => {
    if (filters.homeTeam.length === 0) return { Won: 0, Lost: 0 };
    const teamStats = mockTeamStats.find(s => filters.homeTeam.includes(s.team));
    return { Won: teamStats?.tossWon || 0, Lost: teamStats?.tossLost || 0 };
  }, [filters.homeTeam]);

  // CHANGE 2.2: Bat/Field First availability
  const batFieldFirstAvailability = useMemo(() => {
    if (filters.homeTeam.length === 0) return { batFirst: true, fieldFirst: true };
    const teamStats = mockTeamStats.find(s => filters.homeTeam.includes(s.team));
    return {
      batFirst: (teamStats?.batFirst || 0) > 0,
      fieldFirst: (teamStats?.fieldFirst || 0) > 0,
    };
  }, [filters.homeTeam]);

  // CHANGE 2.3: Venue filter with head-to-head history
  const venueOptionsWithHistory = useMemo(() => {
    if (filters.homeTeam.length === 0 || filters.oppositionTeam.length === 0) {
      return availableVenues.map(v => ({ venue: v, matchCount: 0 }));
    }

    const homeTeam = filters.homeTeam[0];
    const oppositionTeam = filters.oppositionTeam[0];

    return availableVenues.map(venue => {
      const history = mockVenueHistory.find(
        h => h.venue === venue &&
        ((h.homeTeam === homeTeam && h.oppositionTeam === oppositionTeam) ||
         (h.homeTeam === oppositionTeam && h.oppositionTeam === homeTeam))
      );
      return { venue, matchCount: history?.matchCount || 0 };
    });
  }, [availableVenues, filters.homeTeam, filters.oppositionTeam]);

  // CHANGE 2.4: Overs slider max based on match type
  const oversMax = useMemo(() => {
    if (lockedMatchType === 'T20') return 20;
    if (lockedMatchType === '50 Overs') return 50;
    return filters.matchType.includes('T20') ? 20 : 50;
  }, [lockedMatchType, filters.matchType]);

  // CHANGE 2.5: Date range constraints from tournament
  const dateRangeConstraints = useMemo(() => {
    if (!selectedTournamentData) {
      return { min: '', max: '', tournamentName: '' };
    }
    return {
      min: selectedTournamentData.startDate,
      max: selectedTournamentData.endDate,
      tournamentName: selectedTournamentData.name,
    };
  }, [selectedTournamentData]);

  // CHANGE 1.1: Batter options filtered by batter style
  const availableBatters = useMemo(() => {
    const batters = mockPlayers.filter(p => p.batterStyle);

    if (filters.batterStyle.length === 0) {
      return batters;
    }

    return batters.filter(p =>
      p.batterStyle && filters.batterStyle.includes(p.batterStyle)
    );
  }, [filters.batterStyle]);

  // CHANGE 1.1: Auto-detect batter style from selected batters
  const detectedBatterStyle = useMemo(() => {
    if (filters.batter.length === 0) return null;

    const selectedPlayers = mockPlayers.filter(p => filters.batter.includes(p.name));
    const styles = selectedPlayers.map(p => p.batterStyle).filter(Boolean);
    const uniqueStyles = Array.from(new Set(styles));

    // If all selected batters are same style, lock to that style
    if (uniqueStyles.length === 1) {
      return uniqueStyles[0] as 'RHB' | 'LHB';
    }
    return null;
  }, [filters.batter]);

  // CHANGE 1.2: Bowler options filtered by type and style
  const availableBowlers = useMemo(() => {
    let bowlers = mockPlayers.filter(p => p.bowlerType);

    if (filters.bowlerType.length > 0) {
      bowlers = bowlers.filter(p =>
        p.bowlerType && filters.bowlerType.includes(p.bowlerType)
      );
    }

    if (filters.bowlerStyle.length > 0) {
      bowlers = bowlers.filter(p =>
        p.bowlerStyle && filters.bowlerStyle.includes(p.bowlerStyle)
      );
    }

    return bowlers;
  }, [filters.bowlerType, filters.bowlerStyle]);

  // CHANGE 1.2: Bowler type counts with current filters
  const bowlerTypeCounts = useMemo(() => {
    let bowlers = mockPlayers.filter(p => p.bowlerType);

    // Apply bowler style filter if active
    if (filters.bowlerStyle.length > 0) {
      bowlers = bowlers.filter(p =>
        p.bowlerStyle && filters.bowlerStyle.includes(p.bowlerStyle)
      );
    }

    // Apply selected bowlers filter
    if (filters.bowler.length > 0) {
      bowlers = bowlers.filter(p => filters.bowler.includes(p.name));
    }

    const counts: Record<string, number> = { 'Spin': 0, 'Pace': 0, 'Medium Pace': 0 };
    bowlers.forEach(p => {
      if (p.bowlerType) {
        counts[p.bowlerType] = (counts[p.bowlerType] || 0) + 1;
      }
    });

    return counts;
  }, [filters.bowlerStyle, filters.bowler]);

  // Update filter with all cascade logic
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };

      // CHANGE 2.1: Tournament selection cascades
      if (key === 'tournament') {
        const selectedTournament = mockTournaments.find(t =>
          (value as string[]).includes(t.name)
        );

        if (selectedTournament) {
          // Filter teams to tournament teams
          newFilters.homeTeam = prev.homeTeam.filter(team =>
            selectedTournament.teams.includes(team)
          );
          newFilters.oppositionTeam = prev.oppositionTeam.filter(team =>
            selectedTournament.teams.includes(team)
          );

          // Auto-lock match type
          newFilters.matchType = [selectedTournament.matchType];

          // Filter venues
          newFilters.venue = prev.venue.filter(venue =>
            selectedTournament.venues.includes(venue)
          );

          // Auto-adjust overs range max
          const max = selectedTournament.matchType === 'T20' ? 20 : 50;
          if (prev.oversRange[1] > max) {
            newFilters.oversRange = [prev.oversRange[0], max];
          }
        } else {
          // Clear tournament-dependent filters
          newFilters.matchType = [];
        }
      }

      // CHANGE 2.2: Home team selection cascades
      if (key === 'homeTeam') {
        // Remove home team from opposition
        newFilters.oppositionTeam = prev.oppositionTeam.filter(
          team => !(value as string[]).includes(team)
        );
      }

      // CHANGE 2.2: Opposition team selection cascades
      if (key === 'oppositionTeam') {
        // Remove opposition team from home
        newFilters.homeTeam = prev.homeTeam.filter(
          team => !(value as string[]).includes(team)
        );
      }

      // CHANGE 1.1: Batter style affects available batters
      if (key === 'batterStyle') {
        const validBatters = mockPlayers
          .filter(p => p.batterStyle && (value as string[]).includes(p.batterStyle))
          .map(p => p.name);
        newFilters.batter = prev.batter.filter(name => validBatters.includes(name));
      }

      // CHANGE 1.1: Batter selection auto-detects style
      if (key === 'batter' && (value as string[]).length > 0) {
        const selectedPlayers = mockPlayers.filter(p => (value as string[]).includes(p.name));
        const styles = selectedPlayers.map(p => p.batterStyle).filter(Boolean);
        const uniqueStyles = Array.from(new Set(styles));

        if (uniqueStyles.length === 1) {
          newFilters.batterStyle = uniqueStyles as string[];
        }
      }

      // CHANGE 1.2: Bowler type/style affects available bowlers
      if (key === 'bowlerType' || key === 'bowlerStyle') {
        const validBowlers = mockPlayers.filter(p => {
          if (!p.bowlerType) return false;

          const typeMatch = newFilters.bowlerType.length === 0 ||
            newFilters.bowlerType.includes(p.bowlerType);
          const styleMatch = newFilters.bowlerStyle.length === 0 ||
            (p.bowlerStyle && newFilters.bowlerStyle.includes(p.bowlerStyle));

          return typeMatch && styleMatch;
        }).map(p => p.name);

        newFilters.bowler = prev.bowler.filter(name => validBowlers.includes(name));
      }

      return newFilters;
    });
  }, []);

  // Batch update multiple filters
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      tournament: [],
      homeTeam: [],
      oppositionTeam: [],
      venue: [],
      matchType: [],
      homeAway: [],
      tossResult: [],
      batFieldFirst: [],
      oversRange: [1, 20],
      batter: [],
      batterStyle: [],
      bowler: [],
      bowlerType: [],
      bowlerStyle: [],
      deliveryLine: [],
      deliveryLength: [],
      bowlerAction: [],
      dateRange: { startDate: '', endDate: '' },
    });
  }, []);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,

    // Computed values for CHANGE 2
    isMatchTypeLocked: !!lockedMatchType,
    lockedMatchType,
    homeTeamOptions,
    oppositionTeamOptions,
    tossResultCounts,
    batFieldFirstAvailability,
    venueOptionsWithHistory,
    oversMax,
    dateRangeConstraints,

    // Computed values for CHANGE 1
    availableBatters,
    detectedBatterStyle,
    availableBowlers,
    bowlerTypeCounts,
  };
}
