import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Bell, Clock, CheckCircle, AlertCircle, Shield, CalendarCheck } from 'lucide-react';

interface NotificationsProps {
  userRole: string;
  isApproved: boolean;
}

// Map the database columns to a TypeScript interface
interface AppNotification {
  notifications_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function Notifications({ userRole, isApproved }: NotificationsProps) {
  const isClubAdmin = userRole === 'club_admin';
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Admin Pending Requests (Your existing logic)
    if (isClubAdmin) {
      api.get('/api/auth/club/pending-players')
        .then(res => {
          if (res.data.data && res.data.data.length > 0) {
            setHasPendingRequests(true);
          }
        })
        .catch(err => console.warn('Failed to fetch pending queue alerts:', err));
    }

    // 2. 🔥 NEW: Fetch the real notifications from the database
    api.get('/api/notifications') // Make sure this endpoint exists in your backend!
      .then(res => {
        // Assuming your backend returns an array of notifications
        setNotifications(res.data.notifications || res.data || []);
      })
      .catch(err => console.error('Failed to load notifications:', err))
      .finally(() => setLoading(false));
  }, [isClubAdmin]);

  // Helper to pick icons based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_invite':
      case 'scheduled':
        return <CalendarCheck size={18} />;
      case 'system':
        return <Shield size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 text-black animate-fadeIn">
      {/* Header Section */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
          <Bell className="text-[#e60023]" size={24} /> Notifications
        </h2>
        <p className="text-xs text-gray-400 font-semibold mt-0.5">Stay updated with your club affiliation status and dynamic alerts</p>
      </div>

      <div className="space-y-4">
        {/* ─── CASE 1: USER IS CLUB ADMIN ─── */}
        {isClubAdmin && (
          <>
            {hasPendingRequests ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mt-0.5">
                  <AlertCircle size={18} />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">Action Required: Pending Player Affiliations</h4>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    New players have requested onboarding verification. Please navigate to your Administration Console tab to approve or reject these pending applications.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center space-y-2 shadow-sm">
                <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mx-auto border border-green-100">
                  <CheckCircle size={20} />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">Roster Status Up to Date</h4>
                <p className="text-xs text-gray-400 font-semibold">There are no pending player verification requests right now.</p>
              </div>
            )}
          </>
        )}

        {/* ─── CASE 2: USER IS PLAYER / OTHER ROLE ─── */}
        {!isClubAdmin && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-3 items-start shadow-sm">
            {!isApproved ? (
              <>
                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl mt-0.5 border border-amber-100 animate-pulse">
                  <Clock size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900 text-sm">Affiliation Status: Pending Verification</h4>
                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                    Your platform onboarding profile mapping query has been submitted. Full data write-access will remain under Viewer restrictions until your Club Administration panel approves the request.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 bg-green-50 text-green-500 rounded-xl mt-0.5 border border-green-100">
                  <CheckCircle size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900 text-sm">Account Status: Fully Approved!</h4>
                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                    Your player profile mapping is now fully active. Roster write-access and personalized performance dashboard features are successfully unlocked.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── DYNAMIC DATABASE NOTIFICATIONS FEED ─── */}
        <h3 className="font-black text-gray-900 border-b border-gray-200 pb-2 pt-4">Recent Alerts</h3>
        
        {loading ? (
          <div className="text-center py-8 text-xs font-bold text-gray-400 animate-pulse">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-sm font-bold text-gray-400 border border-dashed border-gray-200 rounded-xl">
            You have no new notifications.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.notifications_id} 
                className={`border rounded-2xl p-4 flex gap-3 items-start transition-all ${notif.is_read ? 'bg-white border-gray-200' : 'bg-blue-50/50 border-blue-200 shadow-sm'}`}
              >
                <div className={`p-2 rounded-xl mt-0.5 border ${notif.is_read ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className={`text-sm ${notif.is_read ? 'font-bold text-gray-700' : 'font-black text-gray-900'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${notif.is_read ? 'text-gray-500 font-medium' : 'text-gray-700 font-semibold'}`}>
                    {notif.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}