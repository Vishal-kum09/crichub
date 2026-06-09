import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { toast } from '../../lib/toast';

interface SettingsProps {
  onNavigate: (path: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [name, setName] = useState('Admin Coach');
  const [email, setEmail] = useState('admin@crickethub.com');
  const [theme, setTheme] = useState('light');
  const [defaultTeam, setDefaultTeam] = useState('Mumbai Indians');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Profile updated successfully!');
  };

  const handleSavePreferences = () => {
    toast.success('Preferences saved successfully!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    toast.success('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.success('Account deletion request submitted');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-[#666666] mt-1">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* User Profile */}
        <Card>
          <h3 className="text-xl font-semibold mb-4">User Profile</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-[#e60023] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                AC
              </div>
              <div>
                <Button type="button" variant="secondary" className="text-sm">
                  Change Avatar
                </Button>
                <p className="text-xs text-[#666666] mt-1">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm mb-2">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-2">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <Button type="submit" variant="primary">
              Save Profile
            </Button>
          </form>
        </Card>

        {/* Preferences */}
        <Card>
          <h3 className="text-xl font-semibold mb-4">Preferences</h3>
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm mb-2">Theme</label>
              <div className="flex gap-3">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-6 py-3 rounded-full capitalize transition-colors ${
                      theme === t
                        ? 'bg-[#e60023] text-white'
                        : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Team */}
            <div>
              <label className="block text-sm mb-2">Default Team</label>
              <select
                value={defaultTeam}
                onChange={(e) => setDefaultTeam(e.target.value)}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023]"
              >
                <option>Mumbai Indians</option>
                <option>Chennai Super Kings</option>
                <option>Royal Challengers</option>
                <option>Kolkata Knight Riders</option>
                <option>Rajasthan Royals</option>
                <option>Lucknow Super Giants</option>
              </select>
            </div>

            <Button variant="primary" onClick={handleSavePreferences}>Save Preferences</Button>
          </div>
        </Card>

        {/* Password */}
        <Card>
          <h3 className="text-xl font-semibold mb-4">Change Password</h3>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div>
              <label className="block text-sm mb-2">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <Button type="submit" variant="primary">
              Update Password
            </Button>
          </form>
        </Card>

        {/* Danger Zone */}
        <Card className="border-2 border-[#ef4444]">
          <h3 className="text-xl font-semibold mb-2 text-[#ef4444]">Danger Zone</h3>
          <p className="text-sm text-[#666666] mb-4">
            Irreversible actions. Proceed with caution.
          </p>
          <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
        </Card>
      </div>
    </div>
  );
}
