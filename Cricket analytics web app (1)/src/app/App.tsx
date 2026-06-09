import { useState } from 'react';
import '../utils/suppressWarnings';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Toaster } from './components/ui/sonner';

// Auth Pages
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';

// App Pages
import { Dashboard } from './pages/Dashboard';
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

type Route = {
  path: string;
  params?: Record<string, string>;
};

type UserRole = 'viewer' | 'player' | 'scorer' | 'analyst' | 'club_admin' | 'super_admin';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route>({ path: '/signin' });
  const [selectedTeam, setSelectedTeam] = useState('Mumbai Indians');
  const [userRole, setUserRole] = useState<UserRole>('viewer'); // Mock role - will come from authentication

  const navigate = (path: string, id?: string) => {
    if (id) {
      setCurrentRoute({ path, params: { id } });
    } else {
      setCurrentRoute({ path });
    }
  };

  // Auth pages
  if (!isAuthenticated) {
    if (currentRoute.path === '/signup') {
      return <SignUp onNavigate={navigate} />;
    }
    if (currentRoute.path === '/forgot-password') {
      return <ForgotPassword onNavigate={navigate} />;
    }
    return <SignIn onNavigate={(path, role) => {
      if (path === '/dashboard' && role) {
        setIsAuthenticated(true);
        setUserRole(role);
      }
      navigate(path);
    }} />;
  }

  // Page title mapping
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/matches': 'Matches',
    '/match': 'Match Details',
    '/match-setup': 'Match Setup',
    '/scorer': 'Scorer Console',
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
  };

  const pageTitle = pageTitles[currentRoute.path] || 'CricketHub';

  // Render current page
  const renderPage = () => {
    switch (currentRoute.path) {
      case '/dashboard':
        return <Dashboard onNavigate={navigate} />;
      case '/matches':
        return <Matches onNavigate={navigate} />;
      case '/match':
        return <MatchDetail matchId={currentRoute.params?.id || ''} onNavigate={navigate} />;
      case '/match-setup':
        return <MatchSetup onNavigate={navigate} />;
      case '/scorer':
        return <ScorerConsole matchId={currentRoute.params?.id} onNavigate={navigate} />;
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
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setIsAuthenticated(false);
      setCurrentRoute({ path: '/signin' });
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-[#f9f9f9] flex">
        {/* Sidebar */}
        <Sidebar currentPath={currentRoute.path} onNavigate={navigate} userRole={userRole} />

        {/* Main Content */}
        <div className="flex-1 lg:ml-60">
          {/* Top Bar */}
          <TopBar
            title={pageTitle}
            selectedTeam={selectedTeam}
            onTeamChange={setSelectedTeam}
            onLogout={handleLogout}
          />

          {/* Page Content */}
          <main className="p-4 lg:p-6 pb-20 lg:pb-6">
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}