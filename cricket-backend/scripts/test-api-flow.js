/* Quick end-to-end API smoke test against local backend + Cloud SQL */
const BASE = process.env.API_BASE || 'http://localhost:3000';

const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

(async () => {
  const stamp = Date.now();
  const email = `audit.${stamp}@crickethub.test`;
  const password = 'TestPass123!';

  console.log('1) Register individual');
  let r = await req('POST', '/api/auth/register', {
    email,
    first_name: 'Audit',
    last_name: 'User',
    display_name: 'Audit User',
    phone: '9999999999',
    password
  });
  console.log(r.status, r.data);

  console.log('\n2) Login');
  r = await req('POST', '/api/auth/login', { email, password });
  console.log(r.status, r.data?.user ? { user: r.data.user, hasToken: !!r.data.token } : r.data);
  const token = r.data?.token;

  console.log('\n3) Viewer KPIs (public read)');
  r = await req('GET', '/api/viewer/dashboard/kpis');
  console.log(r.status, r.data);

  console.log('\n4) Club-admin create match without approval (expect 403)');
  r = await req('POST', '/api/club-admin/matches', {
    match_type: 'local',
    venue: 'Test Ground',
    scheduled_at: new Date().toISOString(),
    total_overs: 20
  }, token);
  console.log(r.status, r.data);

  console.log('\n5) Scorer initialize without role (expect 403)');
  r = await req('POST', '/api/scorer/matches/00000000-0000-4000-8000-000000001b5b/initialize', {
    batting_team_id: '00000000-0000-4000-8000-000000000065',
    fielding_team_id: '00000000-0000-4000-8000-000000000066',
    innings_number: 1,
    striker_id: '00000000-0000-4000-8000-0000000003e8',
    non_striker_id: '00000000-0000-4000-8000-0000000003e9',
    bowler_id: '00000000-0000-4000-8000-0000000003ee'
  }, token);
  console.log(r.status, r.data);

  console.log('\n6) Missing frontend route preview (expect 404)');
  r = await req('GET', '/api/scorer/matches/00000000-0000-4000-8000-000000001b5b/preview', null, token);
  console.log(r.status, r.data);

  console.log('\n7) Wrong assigned route vs correct route');
  const wrong = await req('GET', '/api/scorer/assigned-matches', null, token);
  const right = await req('GET', '/api/scorer/matches/assigned', null, token);
  console.log('wrong', wrong.status, wrong.data);
  console.log('right', right.status, right.data);
})();
