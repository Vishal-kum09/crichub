require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = 'http://localhost:3000';

const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

(async () => {
  const login = await req('POST', '/api/auth/login', {
    email: 'scorer@cricket.com',
    password: 'scorer123'
  });
  console.log('scorer login', login.status, login.data.user?.role);
  const token = login.data.token;
  if (!token) process.exit(1);

  const assigned = await req('GET', '/api/scorer/matches/assigned', null, token);
  console.log('assigned', assigned.status, assigned.data.count);

  const matchId = assigned.data.matches?.[0]?.id;
  if (matchId) {
    const preview = await req('GET', `/api/scorer/matches/${matchId}/preview`, null, token);
    console.log('preview', preview.status, {
      team1: preview.data.team1_name,
      roster1: preview.data.team1_roster?.length
    });

    const init = await req('POST', `/api/scorer/matches/${matchId}/initialize`, {
      batting_team_id: preview.data.team1_id,
      fielding_team_id: preview.data.team2_id,
      innings_number: 1,
      striker_id: preview.data.team1_roster[0]?.id,
      non_striker_id: preview.data.team1_roster[1]?.id,
      bowler_id: preview.data.team2_roster[0]?.id
    }, token);
    console.log('initialize', init.status, init.data.innings?.innings_id || init.data.error);
  }

  const clubLogin = await req('POST', '/api/auth/login', {
    email: 'clubadmin@cricket.com',
    password: 'clubadmin123'
  });
  console.log('club admin login', clubLogin.status, clubLogin.data.user?.role);
})();
