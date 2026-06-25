import { useState, useEffect } from 'react';
import { User, Edit, Save, Shield, Palette, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api';

type Theme = 'light' | 'dark';

interface SettingsProps {
  onNavigate: (path: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  
  const [theme, setTheme] = useState<Theme>('light');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', reason: '' });

  // Effect to load user profile and preferences on component mount
  useEffect(() => {
    // Fetch the current user's profile data
    api.get('/api/users/profile').then(response => {
      setProfile({
        name: response.data.display_name || response.data.name,
        email: response.data.email,
      });
    }).catch(() => toast.error("Could not load user profile."));

    // Load saved theme from local storage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const handleProfileSave = async () => {
    if (!profile.name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    try {
      await api.put('/api/users/profile', { name: profile.name });
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error('Failed to update profile.');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast.error('Please fill all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await api.put('/api/users/password', passwordForm);
      toast.success('Password updated successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error('Failed to update password. Please check your old password.');
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    api.put('/api/users/preferences', { theme: newTheme }).catch(() => {/* fail silently */});
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteForm.password) {
      toast.error('Password is required to delete your account.');
      return;
    }
    try {
      await api.delete('/api/users/account', { data: deleteForm });
      toast.success('Account deleted successfully. You will be logged out.');
      onNavigate('/signin'); // Navigate to signin to complete logout
    } catch (err) {
      toast.error('Failed to delete account. Please check your password.');
    }
  };

  return (
    <div className="space-y-8 text-black dark:text-white w-full px-2 sm:px-4 max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account, preferences, and security.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><User size={20} /> User Profile</h2>
          <Button
            onClick={() => {
              if (isEditingProfile) {
                handleProfileSave();
              } else {
                setIsEditingProfile(true);
              }
            }}
            variant="primary"
            className="text-xs font-bold py-1.5 px-3 flex items-center gap-1"
          >
            {isEditingProfile ? <><Save size={14} /> Save</> : <><Edit size={14} /> Edit</>}
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
            <Input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditingProfile}
              className="dark:bg-gray-900 disabled:opacity-70"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email Address</label>
            <Input
              type="email"
              value={profile.email}
              disabled // Usually, email is not editable
              className="dark:bg-gray-900 disabled:opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Palette size={20} /> Theme Preferences</h2>
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Light
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Shield size={20} /> Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Current Password</label>
            <Input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="dark:bg-gray-900" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">New Password</label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Confirm New Password</label>
              <Input type="password" value={passwordForm.confirmNewPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })} className="dark:bg-gray-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" className="font-bold text-sm">Update Password</Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Delete this account</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button onClick={() => setShowDeleteDialog(true)} variant="destructive" className="font-bold text-sm">
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowDeleteDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 p-6">
            <form onSubmit={handleDeleteAccount}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-red-600 dark:text-red-400"><AlertTriangle /> Delete Account</h3>
                <button type="button" onClick={() => setShowDeleteDialog(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                This action cannot be undone. This will permanently delete your account and all associated data.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Reason for leaving (Optional)</label>
                  <Input
                    type="text"
                    value={deleteForm.reason}
                    onChange={(e) => setDeleteForm({ ...deleteForm, reason: e.target.value })}
                    placeholder="e.g., No longer need the service"
                    className="dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">To confirm, please type your password</label>
                  <Input
                    type="password"
                    required
                    value={deleteForm.password}
                    onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                    placeholder="Enter your password"
                    className="dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button type="submit" variant="destructive" className="w-full font-bold text-sm">
                  I understand, delete my account
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}