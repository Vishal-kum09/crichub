const userService = require('../services/userService');

const getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile(req.user.user_id);
    res.status(200).json(profile);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updatedData = await userService.updateProfile(req.user.user_id, req.body);
    res.status(200).json({ message: 'Profile updated successfully', data: updatedData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await userService.updatePassword(req.user.user_id, oldPassword, newPassword);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error.message === 'INCORRECT_PASSWORD') {
      return res.status(401).json({ error: 'Incorrect current password' });
    }
    res.status(500).json({ error: 'Failed to update password' });
  }
};

const updatePreferences = async (req, res) => {
  // Theme state is managed entirely on the frontend via localStorage
  // This just sends a 200 OK so the frontend doesn't throw a console error
  res.status(200).json({ message: 'Preferences acknowledged' });
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    await userService.deleteAccount(req.user.user_id, password);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    if (error.message === 'INCORRECT_PASSWORD') {
      return res.status(401).json({ error: 'Invalid password. Deletion aborted.' });
    }
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteAccount
};