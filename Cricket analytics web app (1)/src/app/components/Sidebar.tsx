import { useState } from 'react';
import { Building2,
  LayoutDashboard,
  Trophy,
  Users,
  UserCircle,
  Settings,
  Shield,
  Menu,
  X,
  ClipboardEdit,
  ClipboardList,
  BarChart3,
  LineChart,
  Star,
  Bell,
  Target,
  Home,
  Bot, // 🔥 NAYA ICON
} from 'lucide-react';
import { cn } from '../../lib/utils';

type UserRole = 'viewer' | 'player' | 'scorer' | 'analyst' | 'club_admin' | 'super_admin' | 'general_member';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole: UserRole;
  userName?: string; // 🔥 NAYA: Dynamic name accept karne ke liye prop add kiya
}

export function Sidebar({ currentPath, onNavigate, userRole, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // All navigation items with precise role restrictions matrix mapping
  const allNavItems = [
    {
      icon: Trophy,
      label: 'Matches',
      path: '/matches',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: ClipboardList,
      label: 'Assigned Matches',
      path: '/assigned-matches',
      roles: ['scorer'] as UserRole[]
    },
    {
      icon: Star,
      label: 'My Performances',
      path: '/my-performances',
      roles: ['player'] as UserRole[]
    },
    {
      icon: Home,
      label: 'My Club',
      path: '/my-club',
      roles: ['general_member'] as UserRole[],
    },
    {
      icon: LineChart,
      label: 'Club Analytics',
      path: '/club-analytics',
      roles: ['scorer', 'club_admin'] as UserRole[]
    },
    {
      icon: BarChart3,
      label: 'NV-Play Analytics',
      path: '/nv-play-analytics',
      roles: ['scorer', 'super_admin', 'club_admin'] as UserRole[]
    },
    {
      icon: Users,
      label: 'Clubs',
      path: '/clubs',
      roles: ['viewer','general_member'] as UserRole[]
    },
    {
      icon: Building2,
      label: 'Registered Clubs',
      path: '/registered-clubs',
      roles: ['super_admin'] as UserRole[]
    },
    {
      icon: Shield,
      label: 'Super Admin',
      path: '/super-admin',
      roles: ['super_admin'] as UserRole[]
    },
    {
      icon: UserCircle,
      label: 'Players',
      path: '/players',
      roles: ['super_admin'] as UserRole[]
    },
    {
      icon: Shield,
      label: 'Club Admin',
      path: '/admin',
      roles: ['club_admin'] as UserRole[]
    },
    {
      icon: Bot,
      label: 'AI Agent',
      path: '/ai-agent',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Target,
      label: 'Ball Tracker',
      path: '/BallTracker',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    { 
      icon: Bell,
      label: 'Notifications', 
      path: '/notifications', 
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/settings',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Role display names
  const roleDisplayNames: Record<UserRole, string> = {
    viewer: 'Viewer',
    player: 'Player',
    scorer: 'Scorer',
    analyst: 'Analyst',
    club_admin: 'Club Admin',
    general_member: 'General Member',
    super_admin: 'Super Admin',
  };

  // 🔥 UPDATE: `Users?.full_name` hata kar prop `userName` use kiya. Fallback aapka naam hi rakha hai.
  const displayName = userName || "Vishal Kumar Singh"; 

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const userInitials = getInitials(displayName);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-[#1a1a1a] text-white rounded-lg shadow-lg active:scale-95 transition-transform"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Layout Canvas */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen bg-[#1a1a1a] text-white transition-transform duration-300 z-40',
          'w-72 sm:w-60 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Frame */}
          <div className="p-6 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#e60023]" size={28} />
              <h1 className="text-xl font-semibold">CricketHub</h1>
            </div>
          </div>

          {/* Dynamic Navigation Stack Loop */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => {
                        onNavigate(item.path);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium',
                        'hover:bg-[#e60023]/10 relative text-left',
                        isActive && 'bg-[#e60023]/10 text-white font-semibold'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e60023] rounded-r" />
                      )}
                      <Icon size={20} className={isActive ? 'text-[#e60023]' : 'text-gray-400'} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile Container Badge Frame */}
          <div className="p-4 border-t border-[#2a2a2a]">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-[#e60023] flex items-center justify-center shadow-md">
                {/* 🔥 UPDATE: Hardcoded "VK" replaced with dynamic variable */}
                <span className="font-bold text-sm">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                {/* 🔥 UPDATE: Hardcoded name replaced with dynamic variable */}
                <p className="text-sm font-bold truncate">{displayName}</p>
                <p className="text-xs text-[#999999] font-semibold">{roleDisplayNames[userRole]}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}