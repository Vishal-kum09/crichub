# Deployment — Cloud Run (project `sportsanalytics-495612`, region `europe-west2`)

This guide contains the **one-time setup** and **deploy** commands for the
CricketHub backend and frontend. The code, Docker artifacts, and Jest suite are
all complete and verified locally. The `gcloud` steps below **must be run by you**
from a machine authenticated to the GCP project (`gcloud auth login`) — they
cannot be executed from the build agent.

Paths:
- Backend dir:  `cricket-backend/`
- Frontend dir: `Cricket analytics web app (1)/`  ← the repo's frontend lives here
  (the task calls this `cricket-frontend/`; the Dockerfile + nginx.conf are in
  this directory).

---

## 4C — Enable APIs + store secrets (one time)

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  --project=sportsanalytics-495612

echo -n "YOUR_DB_PASSWORD" | gcloud secrets create DB_PASSWORD \
  --data-file=- --project=sportsanalytics-495612

echo -n "YOUR_JWT_SECRET" | gcloud secrets create JWT_SECRET \
  --data-file=- --project=sportsanalytics-495612

# Grant the Cloud Run runtime service account access to the secrets
gcloud projects add-iam-policy-binding sportsanalytics-495612 \
  --member="serviceAccount:$(gcloud projects describe sportsanalytics-495612 \
    --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 4D — Deploy backend (run from `cricket-backend/`)

```bash
gcloud run deploy cricket-backend \
  --source . \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DB_NAME=sportsdb,DB_USER=postgres" \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest" \
  --add-cloudsql-instances=sportsanalytics-495612:europe-west2:sportsdb \
  --memory=512Mi --concurrency=100 --min-instances=0 --max-instances=10 \
  --project=sportsanalytics-495612
```

In production `db.js` connects over the Unix socket
`/cloudsql/sportsanalytics-495612:europe-west2:sportsdb` (no TCP host/port, no
TLS — the Cloud SQL Auth Proxy handles transport). `--add-cloudsql-instances`
mounts that socket. Verify:

```bash
curl https://cricket-backend-XXXX-nw.a.run.app/health
# → { "status": "ok", "database": { "status": "connected" }, ... }
```

## 4E — Deploy frontend (run from `Cricket analytics web app (1)/`)

Use the backend URL from 4D:

```bash
gcloud run deploy cricket-frontend \
  --source . \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --build-arg="VITE_API_URL=https://cricket-backend-XXXX-nw.a.run.app" \
  --memory=256Mi --concurrency=200 --min-instances=0 --max-instances=5 \
  --project=sportsanalytics-495612
```

## 4F — Lock CORS to the frontend origin, redeploy backend

`server.js` already reads the production origin from `FRONTEND_ORIGIN`. Set it to
the frontend URL from 4E and redeploy (no code change needed):

```bash
gcloud run services update cricket-backend \
  --region europe-west2 --project=sportsanalytics-495612 \
  --update-env-vars="FRONTEND_ORIGIN=https://cricket-frontend-XXXX-nw.a.run.app"
```

(Backend CORS: `NODE_ENV==='production' ? FRONTEND_ORIGIN : 'http://localhost:5173'`.)

## 4G — Lock down Cloud SQL public IP (LAST, after 4D health is green)

Console → Cloud SQL → `sportsdb` → Connections → Networking:
remove `0.0.0.0/0` from authorized networks (or remove the public IP entirely),
keeping only your dev IP for local access. Cloud Run keeps working via the Unix
socket.

---

## Section 5 — Final verification checklist

1. `curl https://[backend-url]/health` → 200, `database.status == "connected"` (Unix socket).
2. `curl -X POST https://[backend-url]/api/auth/login -H 'Content-Type: application/json' -d '{"email":"...","password":"..."}'` → 200 + JWT.
3. Open `https://[frontend-url]` → app loads, no console errors.
4. Sign in via UI → JWT in `localStorage.cricket_token`, redirected to role dashboard.
5. `cd cricket-backend && npm test` → 4 suites, 13 tests pass. ✅ (verified locally)
6. `grep -r "Agent1234\|super-secret\|34.39" . --exclude-dir=node_modules --exclude-dir=.git` → zero results outside `.env`. ✅ (verified locally)

## Local hardening already verified
- `npm test` → 13/13 passing (scorer, auth, admin, analytics).
- Integration harnesses against the live DB: `node scripts/verify-scorer.js`,
  `verify-admin.js`, `verify-analytics.js` → 64 assertions passing.
- helmet, rate limits (login 10 / otp 5 / auth 20 / api 200 per 15m), Zod on every
  body-mutation endpoint, transactions around every multi-write operation.
