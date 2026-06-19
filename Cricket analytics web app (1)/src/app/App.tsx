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
import NVPlayAnalytics from './pages/NVPlayAnalytics';
import { PlayerPerformance } from './pages/PlayerPerformance';
import { Teams } from './pages/Teams';
import { TeamDetail } from './pages/TeamDetail';
import { Players } from './pages/Players';
import { PlayerDetail } from './pages/PlayerDetail';
import { Admin } from './pages/Admin';
import { ClubAdmin } from './pages/ClubAdmin';
import { SuperAdmin } from './pages/SuperAdmin';
import { Settings } from './pages/Settings';
import { ScorerDashboard } from './pages/Assignedmatches.tsx';
import { Notifications } from './components/notifications'; 

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
};

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route>({ path: '/signin' });
  const [selectedTeam, setSelectedTeam] = useState('Cambridge Phoenix');
  const [userRole, setUserRole] = useState<AppUserRole>('viewer');
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
        setDisplayName(user.display_name);
        setIsAuthenticated(true);
        setCurrentRoute({ path: defaultRouteForRole(role) });
      })
      .catch(() => {
        clearStoredToken();
      })
      .finally(() => setBootstrapping(false));
  }, []);

  const navigate = (path: string, id?: string) => {
    if (id) {
      setCurrentRoute({ path, params: { id } });
    } else {
      setCurrentRoute({ path });
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
    '/analytics': 'Analytics',
    '/nv-play-analytics': 'NV Play Analytics',
    '/my-performances': 'My Performances',
    '/teams': 'Teams',
    '/team': 'Team Details',
    '/players': 'Players',
    '/player': 'Player Details',
    '/admin': 'Club Administration',
    '/super-admin': 'Super Administration',
    '/settings': 'Settings',
    '/ai-agent': 'AI Agent',
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
      case '/analytics':
        return <Analytics matchId={currentRoute.params?.id} onNavigate={navigate} />;
      case '/nv-play-analytics':
        return <NVPlayAnalytics />;
      case '/my-performances':
        return <PlayerPerformance />;
      case '/teams':
        return <Teams onNavigate={navigate} />;
      case '/team':
        return <TeamDetail teamId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/players':
        return <Players onNavigate={navigate} />;
      case '/player':
        return <PlayerDetail playerId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/admin':
        return <ClubAdmin />;
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
        <Sidebar currentPath={currentRoute.path} onNavigate={navigate} userRole={userRole} />
        <div className="flex-1 lg:ml-60">
          <TopBar
            title={pageTitle}
            selectedTeam={selectedTeam}
            onTeamChange={setSelectedTeam}
            onLogout={handleLogout}
            userName={displayName}
            userRole={userRole}
          />
          <main className="p-4 lg:p-6 pb-20 lg:pb-6 bg-[#f9f9f9]">
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}