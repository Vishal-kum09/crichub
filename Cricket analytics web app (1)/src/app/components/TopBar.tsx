import { Search, ChevronDown, Menu, LogOut } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  selectedTeam?: string;
  onTeamChange?: (team: string) => void;
  onLogout?: () => void;
}

export function TopBar({ title, selectedTeam = 'Mumbai Indians', onTeamChange, onLogout }: TopBarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-[#000000] text-white px-4 lg:px-6 flex items-center justify-between border-b border-[#2a2a2a]">
      {/* Left: Title (hidden on mobile when search is open) */}
      <h2 className={`text-lg lg:text-xl font-semibold truncate ${showSearch ? 'hidden md:block' : 'block'}`}>
        {title}
      </h2>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1 justify-end">
        {/* Team Selector - Hidden on small mobile */}
        <div className="hidden sm:block relative">
          <select
            value={selectedTeam}
            onChange={(e) => onTeamChange?.(e.target.value)}
            className="appearance-none bg-[#1a1a1a] text-white px-3 lg:px-4 py-2 pr-8 lg:pr-10 rounded-lg border border-[#2a2a2a] cursor-pointer focus:outline-none focus:border-[#e60023] text-sm lg:text-base"
          >
            <option>Mumbai Indians</option>
            <option>Chennai Super Kings</option>
            <option>Royal Challengers</option>
            <option>Kolkata Knight Riders</option>
            <option>Rajasthan Royals</option>
            <option>Lucknow Super Giants</option>
          </select>
          <ChevronDown className="absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={16} />
        </div>

        {/* Search - Expandable on mobile */}
        <div className={`relative ${showSearch ? 'flex-1 md:flex-none' : ''}`}>
          {showSearch || window.innerWidth >= 768 ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="bg-[#1a1a1a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#2a2a2a] w-full md:w-48 lg:w-64 focus:outline-none focus:border-[#e60023]"
                onBlur={() => setShowSearch(false)}
                autoFocus={showSearch}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-white hover:bg-[#1a1a1a] rounded-lg md:hidden"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full bg-[#e60023] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#c4001e] transition-colors"
          >
            <span className="font-semibold text-sm">AC</span>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#e0e0e0] z-20">
                <div className="p-3 border-b border-[#e0e0e0]">
                  <p className="font-semibold text-sm">Admin Coach</p>
                  <p className="text-xs text-[#666666]">admin@crickethub.com</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[#f9f9f9] flex items-center gap-2 text-[#b30000]"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
