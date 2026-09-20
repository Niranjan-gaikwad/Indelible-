# NeverFail Durable Engine — Demo

## Fastest path: Docker Compose (Postgres + backend + frontend, one command)
```
docker compose up --build
```
Frontend: http://localhost      Backend: http://localhost:8080/api
Postgres runs in its own container with a named volume (`pgdata`), so data survives
container restarts. `restart: always` on the backend container is the Docker-level
equivalent of the systemd unit below — a killed container comes back on its own and
RecoveryRunner resumes any workflow stuck at RUNNING.

To test the real "Hardware Kill" flow under Compose: `docker kill neverfail-demo-backend-1`
— Compose restarts it automatically, same as a bare-metal reboot with the systemd unit.

## Manual run (no Docker)
Requires a running Postgres instance. Quickest way to get one:
```
docker run -d --name pg -e POSTGRES_DB=neverfail -e POSTGRES_USER=neverfail \
  -e POSTGRES_PASSWORD=neverfail -p 5432:5432 postgres:16-alpine
```
Or install Postgres locally and create a `neverfail` DB/user matching
`application.properties` (defaults: user `neverfail`, password `neverfail`, db `neverfail`).

Backend:
```
cd backend
chmod +x run-demo.sh
./run-demo.sh
```
Frontend:
```
cd frontend
npm install
npm run dev
```
Vite's dev server proxies `/api` to `localhost:8080` (see `vite.config.js`) — no hardcoded
URLs, same frontend code runs in dev and in the Docker/nginx build.

## Payment UI
Clicking **Buy Now** now opens a checkout modal (`PaymentModal.jsx`) with sandbox test cards:
- `4242 4242 4242 4242` — succeeds, starts the workflow
- `4000 0000 0000 0002` — declines before the workflow ever starts (separate from the
  **Decline Payment** button, which triggers a mid-workflow decline and real saga
  compensation after the workflow is already running)

## Demo script
1. **Buy Now** → pay with the success test card → watch steps go STARTED → COMPLETED live.
2. **Buy Now** → pay → **Interrupt Thread** mid-run → **Resume**: completed steps show
   SKIPPED (replayed from the log), only remaining steps re-execute.
3. **Buy Now** → pay → **Decline Payment** before charge_card finishes: real saga
   compensation, reserve_stock and charge_card both COMPENSATED, order ends FAILED.
4. **Buy Now** → pay → **Hardware Kill**: real process death. Under Compose or
   `run-demo.sh`/systemd, it restarts and RecoveryRunner resumes automatically, zero
   manual intervention.
5. Close the browser tab mid-workflow, reopen the same URL (`?wf=...`) — or a fresh tab
   with no param — and confirm it recovers via `/api/workflows/latest`.

## Real power-loss survival (bare-metal, not Docker)
`run-demo.sh`'s restart loop dies with the machine on a real power cut. For that:
```
# edit the two /absolute/path/to/... lines in backend/neverfail.service first
sudo cp backend/neverfail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now neverfail
```
If you're deploying via Docker Compose instead, `restart: always` in `docker-compose.yml`
already covers this — Docker's own daemon restarts containers on host reboot when it's
configured to start on boot (`sudo systemctl enable docker`).

## Deploying for real (not localhost)
- **Simplest**: any VPS (DigitalOcean/Linode/a free-tier cloud VM) with Docker installed —
  copy the repo, run `docker compose up -d --build`, point a domain at port 80.
- **Managed platforms** (Render/Railway/Fly.io): create a managed Postgres addon, deploy
  `backend/Dockerfile` as one service with `DB_HOST`/`DB_USER`/`DB_PASSWORD` env vars set
  to the managed DB's credentials, deploy `frontend/Dockerfile` as a second service, and
  point `nginx.conf`'s `proxy_pass` at the backend service's actual URL instead of `backend`
  (that hostname only resolves inside the Compose network).
- Either way, the payment "processor" here is entirely simulated client-side — there's no
  real money movement and nothing to register with a bank. Fine for a demo; say so if asked.
