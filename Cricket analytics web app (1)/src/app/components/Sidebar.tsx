import { useState } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCircle,
  Settings,
  Shield,
  Menu,
  X,
  ClipboardEdit,
  BarChart3,
  Star,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type UserRole = 'viewer' | 'player' | 'scorer' | 'analyst' | 'club_admin' | 'super_admin';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole: UserRole;
}

export function Sidebar({ currentPath, onNavigate, userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // All navigation items with role restrictions
  const allNavItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Trophy,
      label: 'Matches',
      path: '/matches',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: ClipboardEdit,
      label: 'Scorer Console',
      path: '/scorer',
      roles: ['scorer', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Star,
      label: 'My Performances',
      path: '/my-performances',
      roles: ['player'] as UserRole[]
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      path: '/nv-play-analytics',
      roles: ['analyst', 'super_admin'] as UserRole[]
    },
    {
      icon: Users,
      label: 'Teams',
      path: '/teams',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: UserCircle,
      label: 'Players',
      path: '/players',
      roles: ['viewer', 'player', 'scorer', 'analyst', 'club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Shield,
      label: 'Club Admin',
      path: '/admin',
      roles: ['club_admin', 'super_admin'] as UserRole[]
    },
    {
      icon: Shield,
      label: 'Super Admin',
      path: '/super-admin',
      roles: ['super_admin'] as UserRole[]
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
    super_admin: 'Super Admin',
  };

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

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen bg-[#1a1a1a] text-white transition-transform duration-300 z-40',
          'w-72 sm:w-60 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#e60023]" size={28} />
              <h1 className="text-xl font-semibold">CricketHub</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
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
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                        'hover:bg-[#e60023]/10 relative',
                        isActive && 'bg-[#e60023]/10 text-white'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e60023] rounded-r" />
                      )}
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-[#2a2a2a]">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-[#e60023] flex items-center justify-center">
                <span className="font-semibold">AC</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Admin Coach</p>
                <p className="text-xs text-[#999999]">{roleDisplayNames[userRole]}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
