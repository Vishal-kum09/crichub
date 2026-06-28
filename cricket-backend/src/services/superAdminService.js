const superAdminRepo = require('../repositories/superAdminRepository');
const { withTransaction } = require('../../db');

const getClub = async (clubId) => {
  return superAdminRepo.getClub(clubId);
};

const getAllClubs = async () => {
  return superAdminRepo.findAllClubs();
};

const getClubMembers = async (clubId) => {
  return superAdminRepo.findClubMembers(clubId);
};

const getPendingClubs = async () => {
  return superAdminRepo.findPendingClubs();
};

const approveClub = async (clubId) => {
  return withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    return superAdminRepo.approveClub(clubId, exec);
  });
};

const rejectClub = async (clubId) => {
  return withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    return superAdminRepo.rejectClub(clubId, exec);
  });
};

const deleteMatchAudit = async (matchId) => {
  return withTransaction(async (client) => {
    // Verify match exists first
    const match = await superAdminRepo.getMatch(matchId);
    if (!match) throw new Error('MATCH_NOT_FOUND');
    return superAdminRepo.deleteMatchCascade(client, matchId);
  });
};

const getPlatformStats = async () => {
  return superAdminRepo.getPlatformStats();
};

const deleteClub = async (clubId) => {
  return withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    return superAdminRepo.deleteClub(clubId, exec);
  });
};

module.exports = {
  getClub,
  getAllClubs,
  getClubMembers,
  getPendingClubs,
  approveClub,
  rejectClub,
  deleteClub,
  deleteMatchAudit,
  getPlatformStats,
};