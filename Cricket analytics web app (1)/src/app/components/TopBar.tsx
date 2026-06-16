import { Search, LogOut } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  selectedTeam?: string;
  onTeamChange?: (team: string) => void;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
}

export function TopBar({ title, onLogout, userName = 'User', userRole = 'viewer' }: TopBarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-[#000000] text-white px-4 lg:px-6 flex items-center justify-between border-b border-[#2a2a2a] sticky top-0 z-20">
      {/* Left Section */}
      <h2 className={`text-lg lg:text-xl font-bold truncate tracking-tight ${showSearch ? 'hidden md:block' : 'block'}`}>
        {title}
      </h2>

      {/* Right Section */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1 justify-end">
        {/* Search Input Box */}
        <div className={`relative ${showSearch ? 'flex-1 md:flex-none' : ''}`}>
          {showSearch || window.innerWidth >= 768 ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="bg-[#1a1a1a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#2a2a2a] w-full md:w-48 lg:w-64 focus:outline-none focus:border-[#e60023] text-sm"
                onBlur={() => setShowSearch(false)}
                autoFocus={showSearch}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-white hover:bg-[#1a1a1a] rounded-lg md:hidden transition-colors"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Profile Avatar Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full bg-[#e60023] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#c4001e] transition-colors shadow-md"
          >
            <span className="font-bold text-sm">{userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-[#e0e0e0] z-20 overflow-hidden text-black">
                <div className="p-4 bg-gray-50 border-b border-[#e0e0e0]">
                  <p className="font-bold text-sm text-gray-900">{userName}</p>
                  <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5 capitalize">{userRole.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-red-50 flex items-center gap-2 text-[#b30000] transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}