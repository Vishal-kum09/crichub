const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');

const getProfile = async (userId) => {
  const profile = await userRepository.getUserProfile(userId);
  if (!profile) throw new Error('User not found');
  return profile;
};

const updateProfile = async (userId, profileData) => {
  const { first_name, last_name, phone } = profileData;
  const displayName = `${first_name} ${last_name}`.trim();
  
  return await userRepository.updateUserProfile(
    userId, 
    first_name, 
    last_name, 
    displayName, 
    phone
  );
};

const updatePassword = async (userId, oldPassword, newPassword) => {
  const user = await userRepository.getPasswordHash(userId);
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValid) throw new Error('INCORRECT_PASSWORD');

  const saltRounds = 10;
  const newHash = await bcrypt.hash(newPassword, saltRounds);
  
  await userRepository.updatePassword(userId, newHash);
};

const deleteAccount = async (userId, password) => {
  const user = await userRepository.getPasswordHash(userId);
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new Error('INCORRECT_PASSWORD');

  await userRepository.deleteUserAccount(userId);
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount
};