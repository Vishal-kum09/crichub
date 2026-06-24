import { type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Search, ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/Button';
import { type RosterMember, type ClubTeam } from '../../lib/adminApi';

type Props = {
  invite: any;
  myTeams: ClubTeam[];
  myPlayers: RosterMember[];
  myScorers: RosterMember[];
  inviteSelectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  inviteSelectedSquadIds: string[];
  onTogglePlayer: (playerId: string) => void;
  inviteSelectedCaptainId: string;
  onSelectCaptain: (playerId: string) => void;
  inviteSelectedWicketKeeperId: string;
  onSelectWicketKeeper: (playerId: string) => void;
  inviteTeamPlayers: RosterMember[];
  invitePlayerSearch: string;
  onPlayerSearchChange: (value: string) => void;
  inviteScorerId: string;
  onScorerChange: (value: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
};

export function InviteAcceptancePanel({
  invite,
  myTeams,
  myPlayers,
  myScorers,
  inviteSelectedTeamId,
  onSelectTeam,
  inviteSelectedSquadIds,
  onTogglePlayer,
  inviteSelectedCaptainId,
  onSelectCaptain,
  inviteSelectedWicketKeeperId,
  onSelectWicketKeeper,
  inviteTeamPlayers,
  invitePlayerSearch,
  onPlayerSearchChange,
  inviteScorerId,
  onScorerChange,
  onBack,
  onClose,
  onSubmit,
}: Props) {
  const allPlayers = [...inviteTeamPlayers, ...myPlayers];
  const selectedSet = new Set(inviteSelectedSquadIds);
  const uniquePlayers = allPlayers.filter((player, index, all) => all.findIndex((entry) => entry.id === player.id) === index);
  const selectedPlayers = uniquePlayers.filter((player) => selectedSet.has(player.id));
  const availablePlayers = uniquePlayers.filter((player) => {
    const query = invitePlayerSearch.trim().toLowerCase();
    const matchesSearch = !query || `${player.name} ${player.role}`.toLowerCase().includes(query);
    return matchesSearch && !selectedSet.has(player.id);
  });

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/10 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-red-100 pb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900">Accept Match Invite</h3>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Match against {invite.host_club_name}</p>
        </div>
        <button onClick={onClose} className="rounded-full border border-gray-200 bg-white p-1 text-gray-400 shadow-sm hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-500">Select your team</label>
              <select
                value={inviteSelectedTeamId}
                onChange={(e) => onSelectTeam(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#e60023]"
              >
                <option value="">Choose a team from your club</option>
                {myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.player_count})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] text-gray-400">Pick a team first. The squad below updates from that selection.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Selected squad</h4>
                  <span className="text-[10px] font-bold text-gray-400">{selectedPlayers.length}</span>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {selectedPlayers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-[11px] font-semibold text-gray-400">
                      Choose a team to load its players.
                    </p>
                  ) : (
                    selectedPlayers.map((player) => {
                      const isCaptain = inviteSelectedCaptainId === player.id;
                      const isKeeper = inviteSelectedWicketKeeperId === player.id;
                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => onTogglePlayer(player.id)}
                          className="w-full rounded-xl border border-[#e60023]/15 bg-white px-3 py-3 text-left shadow-sm transition hover:border-[#e60023]/30 hover:bg-red-50/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-gray-900">{player.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{player.role || 'Player'}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isCaptain && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">Captain</span>}
                              {isKeeper && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700">WK</span>}
                              <span className="rounded-full bg-[#e60023] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Remove</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Available players</h4>
                  <span className="text-[10px] font-bold text-gray-400">{availablePlayers.length}</span>
                </div>

                <label className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <Search size={14} className="text-gray-400" />
                  <input
                    value={invitePlayerSearch}
                    onChange={(e) => onPlayerSearchChange(e.target.value)}
                    placeholder="Search by name or role"
                    className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </label>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {availablePlayers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-[11px] font-semibold text-gray-400">
                      No players match the current search.
                    </p>
                  ) : (
                    availablePlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => onTogglePlayer(player.id)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-[#e60023]/30 hover:bg-red-50/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-900">{player.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{player.role || 'Player'}</p>
                          </div>
                          <span className="rounded-full bg-[#e60023]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e60023]">Add</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h5 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
                <ShieldCheck className="text-green-600" size={14} />
                Optional match roles
              </h5>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Captain</label>
                  <select
                    value={inviteSelectedCaptainId}
                    onChange={(e) => onSelectCaptain(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#e60023]"
                  >
                    <option value="">No captain selected</option>
                    {selectedPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Wicket keeper</label>
                  <select
                    value={inviteSelectedWicketKeeperId}
                    onChange={(e) => onSelectWicketKeeper(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#e60023]"
                  >
                    <option value="">No wicket keeper selected</option>
                    {selectedPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs font-semibold text-gray-500 shadow-inner">
              <h5 className="mb-2 flex items-center gap-2 font-black text-gray-800">
                <ShieldCheck className="text-green-600" size={14} />
                Match details
              </h5>
              <p><span className="font-black text-gray-700">Venue:</span> {invite.venue}</p>
              <p><span className="font-black text-gray-700">Schedule:</span> {invite.match_date} @ {invite.start_time || '10:00 AM'}</p>
              <p className="pt-1 text-[11px] text-gray-400">Captain, wicket keeper, and scorer are optional. You can accept now and fine-tune the squad later.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Assign scorer from your club</label>
              <select
                value={inviteScorerId}
                onChange={(e) => onScorerChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#e60023]"
              >
                <option value="">Skip for now</option>
                {myScorers.map((scorer) => (
                  <option key={scorer.id} value={scorer.id}>
                    {scorer.name} ({scorer.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 text-xs">
              <Button type="button" onClick={onBack} variant="secondary" className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2.5 font-bold">
                <ArrowLeft size={14} /> Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1 rounded-lg border-none bg-green-600 py-2.5 font-bold text-white shadow-md hover:bg-green-700">
                Accept and schedule match
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
