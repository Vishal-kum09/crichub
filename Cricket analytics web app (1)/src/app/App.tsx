import { useEffect, useState } from 'react';
import '../utils/suppressWarnings';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Toaster } from './components/ui/sonner';
// 🔥 AI Chat Tab Imported Here
import {AIChatTab} from './components/AIChatTab.tsx'
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import BallTrajectory from './pages/BallTracker';


import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { MatchSetup } from './pages/MatchSetup';
import { ScorerConsole } from './pages/ScorerConsole';
import { Analytics } from './pages/Analytics';
import ClubAnalytics from './pages/ClubAnalytics';
import NVPlayAnalytics from './pages/NVPlayAnalytics';
import { PlayerPerformance } from './pages/PlayerPerformance'; // This will be used for player-specific views
import { Clubs } from './pages/Clubs.tsx'; // Renamed from Teams
import { MyClub } from './pages/MyClub.tsx'; // New component for General Members
import { ClubDetail } from './pages/ClubDetail.tsx'; // New component for club details
import { PlayerDetail } from './pages/PlayerDetail';
import { Admin } from './pages/Admin';
import { ClubAdmin } from './pages/ClubAdmin';
import { RegisteredClubs } from './pages/RegisteredClubs';
import { SuperAdmin } from './pages/SuperAdmin';
import { Settings } from './pages/Settings';
import { ScorerDashboard } from './pages/Assignedmatches.tsx';
import { Notifications } from './components/notifications'; 
import { Players } from './pages/Players';

import {
  clearStoredToken,
  defaultRouteForRole,
  getMe,
  getStoredToken,
  toAppRole,
  type AppUserRole,
} from '../lib/authApi';

type Route = {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
};

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route>({ path: '/signin' });
  const [selectedTeam, setSelectedTeam] = useState('Cambridge Phoenix');
  const [userRole, setUserRole] = useState<AppUserRole>('viewer');
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('User');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBootstrapping(false);
      return;
    }
    getMe()
      .then((user) => {
        const role = toAppRole(user.role);
        setUserRole(role);
        setUserClubId(user.club_id);
        setDisplayName(user.display_name);
        setIsAuthenticated(true);
        setCurrentRoute({ path: defaultRouteForRole(role) });
      })
      .catch(() => {
        clearStoredToken();
      })
      .finally(() => setBootstrapping(false));
  }, []);

  const navigate = (path: string, id?: string, extraQuery?: Record<string, string>) => {
    const query: Record<string, string> = extraQuery || {};
    if (id) {
      setCurrentRoute({ path, params: { id }, query });
    } else {
      setCurrentRoute({ path, query });
    }
  };

  const handleAuthSuccess = (path: string, role: AppUserRole, name?: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
    if (name) setDisplayName(name);
    navigate(path);
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-gray-500 font-medium">
        Loading CricketHub...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentRoute.path === '/signup') {
      return <SignUp onNavigate={navigate} />;
    }
    if (currentRoute.path === '/forgot-password') {
      return <ForgotPassword onNavigate={navigate} />;
    }
    return (
      <SignIn
        onNavigate={(path, role, name) => {
          if (role) {
            handleAuthSuccess(path, role as AppUserRole, name);
          } else {
            navigate(path);
          }
        }}
      />
    );
  }

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/notifications': 'Notifications', 
    '/matches': 'Matches',
    '/match': 'Match Details',
    '/match-setup': 'Match Setup',
    '/scorer': 'Scorer Console',
    '/assigned-matches': 'Scorer Console Dashboard',
    '/club-analytics': 'Club Analytics',
    '/club-analytics/match': 'Match Analysis',
    '/club-analytics/player': 'Player Analysis',
    '/analytics': 'Analytics',
    '/nv-play-analytics': 'NV Play Analytics',
    '/my-performances': 'My Performances', // This remains for players
    '/clubs': 'Clubs', // Updated path and title
    '/my-club': 'My Club',
    '/team': 'Club Details',
    '/players': 'Players',
    '/player': 'Player Details',
    '/admin': 'Club Administration',
    '/super-admin': 'Super Administration',
    '/settings': 'Settings',
    '/ai-agent': 'AI Agent',
    '/club': 'Club Details',
    '/BallTracker': 'BallTracker',
     // 🔥 Added Title
  };

  const pageTitle = pageTitles[currentRoute.path] || 'CricketHub';

  const renderPage = () => {
    switch (currentRoute.path) {
      case '/matches':
        return <Matches onNavigate={navigate} />;
      case '/match':
        return <MatchDetail matchId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/match-setup':
        return <MatchSetup matchId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/scorer':
        return <ScorerConsole matchId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/assigned-matches':
        return <ScorerDashboard onNavigate={navigate} />;
      case '/club-analytics':
        return <ClubAnalytics onNavigate={navigate} />;
      case '/club-analytics/match':
        return <ClubAnalytics matchId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/club-analytics/player':
        return <ClubAnalytics playerId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/analytics':
        return <Analytics matchId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/nv-play-analytics':
        return <NVPlayAnalytics />;
      case '/my-performances':
        return <PlayerPerformance />;
      case '/clubs':
        return <Clubs onNavigate={navigate} />;
      case '/my-club':
        return <MyClub clubId={userClubId || ''} onNavigate={navigate} />;
      case '/club':
        return <ClubDetail clubId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/players':
        return <Players onNavigate={navigate} />;
      case '/player':
        return <PlayerDetail playerId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/registered-clubs':
        return <RegisteredClubs onNavigate={navigate} />;
      case '/admin':
        const managedClubId = currentRoute.params?.managedClubId || currentRoute.query?.managedClubId;
        return <ClubAdmin managedClubId={managedClubId} />;
      case '/super-admin':
        return <SuperAdmin />;
      case '/settings':
        return <Settings onNavigate={navigate} />;
      case '/notifications':
        return <Notifications userRole={userRole} isApproved={true} />;
      
      // 👇 🔥 YAHAN ADD KIYA HAI AI AGENT KA ROUTE 🔥 👇
      case '/ai-agent':
        return <AIChatTab />;
      case '/BallTracker':
        return <BallTrajectory/>;
      default:
        return <Matches onNavigate={navigate} />;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      clearStoredToken();
      setIsAuthenticated(false);
      setUserRole('viewer');
      setCurrentRoute({ path: '/signin' });
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-[#f9f9f9] flex">
        <Sidebar currentPath={currentRoute.path} onNavigate={navigate} userRole={userRole} userName={displayName}/>
        <div className="flex-1 lg:ml-60">
          <TopBar
            title={pageTitle}
            selectedTeam={selectedTeam}
            onTeamChange={setSelectedTeam}
            onLogout={handleLogout}
            userName={displayName}
            userRole={userRole}
          />
          <main className="pb-20 lg:pb-6 bg-[#f9f9f9]">
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}
