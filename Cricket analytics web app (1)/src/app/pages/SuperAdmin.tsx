import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Bell, Database, CheckCircle, XCircle, Shield,
  Eye, Edit, Trash2, ChevronRight, Search, Users,
  Trophy, BarChart3, RefreshCw, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from '../../lib/toast';
import {
  getClubs,
  getClubMembers,
  getSuperPendingApprovals,
  approveClub as apiApproveClub,
  rejectClubRegistration,
  getPlatformStats,
  deleteMatchAudit,
  type PlatformStats,
  type ClubSummary,
} from '../../lib/adminApi';

// ─── ADDED: Interface to fix the 'badge' type error ─────────────
interface TabItem {
  id: 'super-admin' | 'data-management';
  icon: React.ElementType;
  label: string;
  badge?: number;
}
// ───────────────────────────────────────────────────────────────

// ─── Inline Spinner ────────────────────────────────────────────────────────────
function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className || ''}`} size={20} />;
}

// ─── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({
  open, title, message, confirmLabel, confirmVariant,
  onConfirm, onCancel, loading
}: {
  open: boolean; title: string; message: string;
  confirmLabel?: string; confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{title}</h3>
        <p className="text-[#666666] text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-[#666666] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading && <Spinner />}
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Club Members Drawer ───────────────────────────────────────────────────────
function ClubMembersDrawer({
  clubId, clubName, onClose
}: {
  clubId: string; clubName: string; onClose: () => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getClubMembers(clubId)
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => { toast.error('Failed to load members'); setMembers([]); })
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e0e0] p-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-[#1a1a1a]">
            <Users className="inline mr-2 text-purple-600" size={20} />
            {clubName} — Members
          </h3>
          <button onClick={onClose} className="text-[#666666] hover:text-[#1a1a1a] p-1">
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#666666]">
              <Spinner className="mr-2" /> Loading members...
            </div>
          ) : members.length === 0 ? (
            <p className="text-center py-8 text-[#666666]">No members found.</p>
          ) : (
            <div className="space-y-3">
              {members.map((m: any) => (
                <div key={m.id} className="p-3 border border-[#e0e0e0] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{m.display_name || m.name || 'Unknown'}</p>
                      <p className="text-xs text-[#666666]">{m.email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      m.account_role === 'Club_Admin' ? 'bg-purple-100 text-purple-700' :
                      m.account_role === 'Scorer' ? 'bg-blue-100 text-blue-700' :
                      m.account_role === 'Player' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(m.account_role || m.role || '').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[#666666]">
                    <span className={`flex items-center gap-1 ${
                      m.is_approved ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {m.is_approved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                    {m.is_active !== undefined && (
                      <span className={m.is_active ? 'text-green-600' : 'text-red-600'}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main SuperAdmin Component ─────────────────────────────────────────────────
export function SuperAdmin() {
  const [activeTab, setActiveTab] = useState<'super-admin' | 'data-management'>('super-admin');

  // Data states
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string;
    action: () => Promise<void>; variant?: 'danger' | 'primary';
  }>({ open: false, title: '', message: '', action: async () => {} });
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Loaders ────────────────────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await getSuperPendingApprovals();
      setPendingRegistrations(Array.isArray(data) ? data : []);
    } catch { setPendingRegistrations([]); }
    finally { setLoadingPending(false); }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getPlatformStats();
      setStats(data);
    } catch { setStats(null); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { loadPending(); loadStats(); }, [loadPending, loadStats]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleApproveClub = async (id: string) => {
    const club = pendingRegistrations?.find((r: any) => (r.club_id || r.id) === id);
    try {
      await apiApproveClub(id);
      setPendingRegistrations((prev: any[]) => prev.filter((r: any) => (r.club_id || r.id) !== id));
      toast.success(`${club?.name || 'Club'} approved successfully!`);
      loadPending();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve club');
    }
  };

  const confirmRejectClub = (id: string) => {
    const club = pendingRegistrations?.find((r: any) => (r.club_id || r.id) === id);
    setConfirmState({
      open: true,
      title: 'Reject Club Registration',
      message: `Are you sure you want to reject and remove "${club?.name || 'this club'}"? This action cannot be undone.`,
      variant: 'danger',
      action: async () => {
        await rejectClubRegistration(id);
        setPendingRegistrations((prev: any[]) => prev.filter((r: any) => (r.club_id || r.id) !== id));
        toast.error(`${club?.name || 'Club'} registration rejected and removed`);
        loadStats();
      },
    });
  };

  const confirmDeleteMatch = (matchId: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Match Permanently',
      message: `Are you sure you want to permanently delete match ${matchId}? All associated data (innings, deliveries, scorecards, etc.) will be irreversibly removed.`,
      variant: 'danger',
      action: async () => {
        await deleteMatchAudit(matchId);
        toast.success('Match deleted successfully');
        loadStats();
      },
    });
  };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      await confirmState.action();
      setConfirmState({ open: false, title: '', message: '', action: async () => {} });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.variant === 'danger' ? 'Delete' : 'Confirm'}
        confirmVariant={confirmState.variant}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ ...confirmState, open: false })}
        loading={actionLoading}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Super Administration</h1>
        <p className="text-white/90">Platform-wide management and oversight</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Building2 size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Clubs</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalClubs}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Users</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Trophy size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Matches</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalMatches}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <BarChart3 size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Tournaments</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalTournaments}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Users size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Players</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalPlayers}</p>
          </div>
        </div>
      )}

      {/* ──────────── TAB NAVIGATION (FIXED) ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {( [
          { id: 'super-admin', icon: Shield, label: 'Club Approvals', badge: pendingRegistrations.length },
          { id: 'data-management', icon: Database, label: 'Database Management' },
        ] as TabItem[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'super-admin' | 'data-management')}
            className={`p-4 rounded-xl font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-purple-600'
            }`}
          >
            <tab.icon className="mx-auto mb-2" size={24} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>


      {/* ──────────── CLUB APPROVALS TAB CONTENT ──────────── */}
      {(activeTab === 'super-admin') && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Pending Club Approvals</h2>
            <button
              onClick={loadPending}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loadingPending ? (
            <div className="flex items-center justify-center py-12 text-[#666666]">
              <Spinner className="mr-2" /> Loading pending approvals...
            </div>
          ) : pendingRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
              <p className="text-[#666666]">All caught up! No pending club registrations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRegistrations.map((club: any) => {
                const clubUid = club.club_id || club.id;
                return (
                  <div
                    key={clubUid}
                    className="p-4 border border-[#e0e0e0] rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#1a1a1a]">{club.name}</h3>
                        <p className="text-sm text-[#666666]">
                          Admin: {club.owner_name || club.admin_name || 'N/A'}
                          {club.admin_email && <span> ({club.admin_email})</span>}
                        </p>
                        <p className="text-xs text-[#999999]">
                          {club.country && `Country: ${club.country} | `}
                          Applied: {club.created_at ? new Date(club.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveClub(clubUid)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => confirmRejectClub(clubUid)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────── DATA MANAGEMENT TAB CONTENT ──────────── */}
      {activeTab === 'data-management' && (
        <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1a1a1a]">Platform Data Management</h2>
            {loadingStats && <Spinner />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stats Card */}
            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <Database className="text-purple-600 mb-3" size={32} />
              <h3 className="font-semibold text-[#1a1a1a] mb-2">Database Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#666666]">Total Clubs:</span>
                  <span className="font-semibold text-[#1a1a1a]">{stats?.totalClubs ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#666666]">Total Users:</span>
                  <span className="font-semibold text-[#1a1a1a]">{stats?.totalUsers ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#666666]">Total Matches:</span>
                  <span className="font-semibold text-[#1a1a1a]">{stats?.totalMatches ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#666666]">Active Tournaments:</span>
                  <span className="font-semibold text-[#1a1a1a]">{stats?.totalTournaments ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#666666]">Total Players:</span>
                  <span className="font-semibold text-[#1a1a1a]">{stats?.totalPlayers ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* Operations Card */}
            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <h3 className="font-semibold text-[#1a1a1a] mb-4">Data Operations</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const matchId = prompt('Enter Match ID to delete permanently:');
                    if (matchId && matchId.trim()) confirmDeleteMatch(matchId.trim());
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <Trash2 size={14} className="inline mr-2" />
                  Delete Match (Data Audit)
                </button>
                <button
                  onClick={() => toast.success('Export feature coming soon')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Export All Data
                </button>
                <button
                  onClick={() => toast.success('Report generation coming soon')}
                  className="w-full px-4 py-2 bg-[#f5f5f5] text-[#666666] rounded-lg hover:bg-[#e0e0e0] transition-colors text-sm"
                >
                  Generate Reports
                </button>
                <button
                  onClick={() => toast.success('Audit logs coming soon')}
                  className="w-full px-4 py-2 bg-[#f5f5f5] text-[#666666] rounded-lg hover:bg-[#e0e0e0] transition-colors text-sm"
                >
                  View Audit Logs
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Warning:</strong> Data management operations have platform-wide impact.
                Please ensure proper backups before performing any destructive operations.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}