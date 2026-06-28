import { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api';

// Updated interface to handle slight variations from the backend
interface Club {
  id?: string;
  club_id?: string;
  name?: string;
  club_name?: string;
  country?: string;
  members?: number;
  memberCount?: number;
  matches?: number;
}

interface RegisteredClubsProps {
  onNavigate?: (path: string, id?: string, extraQuery?: Record<string, string>) => void;
}

export function RegisteredClubs({ onNavigate }: RegisteredClubsProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/api/super-admin/clubs')
      .then((res) => setClubs(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load clubs'))
      .finally(() => setLoading(false));
  }, []);

  const confirmDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete club "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/super-admin/clubs/${id}/remove`);
      // Update state using the fallback IDs
      setClubs((prev) => prev.filter((c) => (c.club_id || c.id) !== id));
      toast.success('Club deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete club');
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Registered Clubs</h2>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search clubs by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {loading ? (
        <p className="text-center py-12 text-[#666666]">Loading clubs...</p>
      ) : (clubs.filter(c => (c.club_name || c.name || '').toLowerCase().includes(search.toLowerCase())).length === 0) ? (
        <p className="text-center py-8 text-[#666666]">No clubs match your search.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-[#e0e0e0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0]">
                <th className="text-left py-3 px-4 font-medium text-[#666666]">Club Name</th>
                <th className="text-center py-3 px-4 font-medium text-[#666666]">Affiliated Members</th>
                  <th className="text-center py-3 px-4 font-medium text-[#666666]">Active Players</th>
                <th className="text-right py-3 px-4 font-medium text-[#666666]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clubs.filter(c => (c.club_id || c.id || c.club_name || c.name || '').toLowerCase().includes(search.toLowerCase())).map((club, index) => {
                // Safely extract values in case backend keys are named slightly differently
                const uniqueId = club.club_id || club.id || `fallback-key-${index}`;
                const displayName = club.club_name || club.name || 'Unnamed Club';
                const totalMembers = club.members ?? club.memberCount ?? 0;
                const activePlayers = (club as any).activePlayers ?? 0;

                return (
                  <tr key={uniqueId} className="border-b border-[#e0e0e0] hover:bg-[#f9f9f9]">
                    <td className="py-3 px-4 font-medium text-purple-600">{displayName}</td>
                    <td className="py-3 px-4 text-center">{totalMembers}</td>
                    <td className="py-3 px-4 text-center">{activePlayers}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          onNavigate?.('/admin', undefined, { managedClubId: uniqueId });
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs transition-colors"
                      >
                        Manage Club
                      </button>
                      <button
                        onClick={() => confirmDelete(uniqueId, displayName)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}