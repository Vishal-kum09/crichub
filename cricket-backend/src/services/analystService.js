// Analyst service — thin pass-through to the nv_play aggregation repository.
// The repository already shapes each response; the service exists to keep the
// controller free of data-access and to host any future cross-aggregation logic.
const repo = require('../repositories/analystRepository');

const teamStreams = (filters) => repo.teamAggregations(filters);
const playerStreams = (filters) => repo.playerAggregations(filters);
const tournamentStreams = (filters) => repo.tournamentAggregations(filters);
const matchStreams = (filters) => repo.matchAggregations(filters);

module.exports = { teamStreams, playerStreams, tournamentStreams, matchStreams };
