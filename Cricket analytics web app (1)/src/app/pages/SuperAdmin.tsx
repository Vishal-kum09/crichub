import { useEffect, useState } from 'react';
import { Building2, Bell, Database, CheckCircle, XCircle, Eye, Edit, Trash2, ChevronRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import {
  getClubs,
  getClubMembers,
  getSuperPendingApprovals,
  approveClub as apiApproveClub,
  type ClubSummary,
  type ClubMember,
  type PendingClub,
} from '../../lib/adminApi';

export function SuperAdmin() {
  const [activeTab, setActiveTab] = useState<'clubs' | 'notifications' | 'data-management'>('clubs');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // Live data — loaded from the backend (empty until fetched / on error).
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingClub[]>([]);

  const loadClubs = () => { getClubs().then(setClubs).catch(() => setClubs([])); };
  const loadPending = () => {
    getSuperPendingApprovals().then(setPendingRegistrations).catch(() => setPendingRegistrations([]));
  };

  useEffect(() => { loadClubs(); loadPending(); }, []);

  // Fetch members whenever a club is drilled into.
  useEffect(() => {
    if (!selectedClub) { setClubMembers([]); return; }
    getClubMembers(selectedClub).then(setClubMembers).catch(() => setClubMembers([]));
  }, [selectedClub]);

  const handleApproveClub = async (id: string) => {
    const club = pendingRegistrations.find(r => r.id === id);
    try {
      await apiApproveClub(id);
      setPendingRegistrations(prev => prev.filter(r => r.id !== id));
      toast.success(`${club?.name} approved successfully!`);
      loadClubs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve club');
    }
  };

  const handleRejectClub = (id: string) => {
    const club = pendingRegistrations.find(r => r.id === id);
    setPendingRegistrations(prev => prev.filter(r => r.id !== id));
    toast.error(`${club?.name} registration rejected`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Super Administration</h1>
        <p className="text-white/90">Platform-wide management and oversight</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab('clubs')}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'clubs'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-purple-600'
          }`}
        >
          <Building2 className="mx-auto mb-2" size={24} />
          Clubs Management
        </button>
        <button
          onClick={() => {
            setActiveTab('notifications');
            setSelectedClub(null);
          }}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'notifications'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-purple-600'
          }`}
        >
          <Bell className="mx-auto mb-2" size={24} />
          Pending Registrations
        </button>
        <button
          onClick={() => {
            setActiveTab('data-management');
            setSelectedClub(null);
          }}
          className={`p-4 rounded-xl font-semibold transition-all ${
            activeTab === 'data-management'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-purple-600'
          }`}
        >
          <Database className="mx-auto mb-2" size={24} />
          Data Management
        </button>
      </div>

      {/* Clubs Management Tab */}
      {activeTab === 'clubs' && !selectedClub && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">All Registered Clubs</h2>

          <div className="grid grid-cols-1 gap-4">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="border border-[#e0e0e0] rounded-lg p-4 hover:border-purple-600 transition-colors cursor-pointer"
                onClick={() => setSelectedClub(club.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="text-purple-600" size={24} />
                      <h3 className="font-semibold text-[#1a1a1a] text-lg">{club.name}</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {club.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-[#666666] mt-3">
                      <div>
                        <p className="text-xs text-[#999999]">Location</p>
                        <p className="font-medium text-[#1a1a1a]">{club.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">Members</p>
                        <p className="font-medium text-[#1a1a1a]">{club.members}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">Matches</p>
                        <p className="font-medium text-[#1a1a1a]">{club.matches}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999999]">Registered</p>
                        <p className="font-medium text-[#1a1a1a]">
                          {new Date(club.registeredDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-[#666666]" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Club Detail View */}
      {activeTab === 'clubs' && selectedClub && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedClub(null)}
            className="flex items-center gap-2 text-purple-600 hover:underline"
          >
            ← Back to Clubs
          </button>

          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#1a1a1a]">
                  {clubs.find(c => c.id === selectedClub)?.name}
                </h2>
                <p className="text-[#666666] mt-1">
                  {clubs.find(c => c.id === selectedClub)?.location}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[#f5f5f5] text-[#666666] rounded-lg hover:bg-[#e0e0e0] transition-colors">
                  Edit Club
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Delete Club
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Club Members</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#666666]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clubMembers.map((member) => (
                    <tr key={member.id} className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9]">
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{member.name}</td>
                      <td className="py-3 px-4 text-[#666666]">{member.role}</td>
                      <td className="py-3 px-4 text-[#666666]">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button className="p-1 text-[#666666] hover:text-purple-600">
                            <Eye size={16} />
                          </button>
                          <button className="p-1 text-[#666666] hover:text-purple-600">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-[#666666] hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pending Registrations Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Pending Club Registrations</h2>

          {pendingRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto mb-4 text-[#e0e0e0]" size={48} />
              <p className="text-[#666666]">No pending registrations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRegistrations.map((registration) => (
                <div key={registration.id} className="border border-[#e0e0e0] rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="text-purple-600" size={24} />
                        <h3 className="font-semibold text-[#1a1a1a] text-lg">{registration.name}</h3>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                          {registration.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#666666] mt-3">
                        <p>Admin: <span className="font-medium text-[#1a1a1a]">{registration.admin}</span></p>
                        <p>Email: <span className="font-medium text-[#1a1a1a]">{registration.email}</span></p>
                        <p>Location: <span className="font-medium text-[#1a1a1a]">{registration.location}</span></p>
                        <p>Applied: <span className="font-medium text-[#1a1a1a]">
                          {new Date(registration.date).toLocaleDateString()}
                        </span></p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClub(registration.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectClub(registration.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data-management' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Platform Data Management</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <Database className="text-purple-600 mb-3" size={32} />
              <h3 className="font-semibold text-[#1a1a1a] mb-2">Database Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666666]">Total Clubs:</span>
                  <span className="font-semibold text-[#1a1a1a]">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Total Users:</span>
                  <span className="font-semibold text-[#1a1a1a]">375</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Total Matches:</span>
                  <span className="font-semibold text-[#1a1a1a]">167</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Active Tournaments:</span>
                  <span className="font-semibold text-[#1a1a1a]">8</span>
                </div>
              </div>
            </div>

            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <h3 className="font-semibold text-[#1a1a1a] mb-4">Data Operations</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Export All Data
                </button>
                <button className="w-full px-4 py-2 bg-[#f5f5f5] text-[#666666] rounded-lg hover:bg-[#e0e0e0] transition-colors">
                  Generate Reports
                </button>
                <button className="w-full px-4 py-2 bg-[#f5f5f5] text-[#666666] rounded-lg hover:bg-[#e0e0e0] transition-colors">
                  Audit Logs
                </button>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Database Cleanup
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Data management operations have platform-wide impact.
              Please ensure proper backups before performing any destructive operations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
