# mova
**MOVA** is an installable, offline-fast Point of Sale (POS) platform designed to work across desktops, tablets, and phones with or without dedicated hardware. Built for reliability and performance, it features multi-role access, high-speed cashier checkout, camera and physical barcode scanning, real-time inventory tracking, sales management, actionable analytics reporting, and automatic synchronization when connectivity is restored.

## Authentication and deployment

- Email registration and password sign-in use the MOVA API and MongoDB.
- Google sign-in verifies Google ID tokens on the API. First-time Google users provide a business name and type to create the owner account and main branch.
- Copy `client/.env.example` to `client/.env.local` for local frontend configuration. Set `VITE_API_URL` to the API base URL and `VITE_GOOGLE_CLIENT_ID` to a Google OAuth 2.0 Web client ID.
- Copy `server/.env.example` to `server/.env` locally. Use a hosted MongoDB URI and a newly generated, private `JWT_SECRET` in production; never deploy the local `.env` file.
- The frontend is configured for Vercel through `client/vercel.json`. Set its root directory to `client`, build command to `npm run build`, and output directory to `dist`.
- `server/render.yaml` configures the API for Render. Supply `MONGO_URI`, `CLIENT_URL`, and `GOOGLE_CLIENT_ID` when Render prompts for them. Set the frontend's `VITE_API_URL` to the deployed API URL plus `/api`.
- In Google Cloud Console, configure the OAuth consent screen and add the deployed frontend origin to the OAuth client's authorized JavaScript origins. Set the same client ID as `VITE_GOOGLE_CLIENT_ID` for the frontend build and `GOOGLE_CLIENT_ID` for the API.
- The API allows the production MOVA Vercel domain and project preview URLs. Put any custom frontend domains in Render's `CLIENT_URL` (comma-separated, with no trailing slash) and redeploy the API. Rebuild the frontend whenever its `VITE_*` settings change.


## Secure authentication setup

### Local development

1. Use Node.js 20 or newer. Run `npm ci` in both `server/` and `client/`.
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`. Fill in local values privately; never commit these files.
3. Configure a Google OAuth 2.0 **Web application** client in Google Cloud Console. Add `http://localhost:5173` as an authorized JavaScript origin. Use the same client ID in `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`.
4. Configure SMTP credentials for password recovery. The API intentionally returns a generic response even if email delivery fails or the account does not exist. Check server logs and SMTP provider delivery logs during setup.
5. Start the API with `npm run dev` from `server/`, and the UI with `npm run dev` from `client/`.

### Production deployment

- Deploy the API from `server/` to Render using `server/render.yaml`; configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `APP_URL`, `GOOGLE_CLIENT_ID`, and SMTP values in the hosting provider's secret/environment settings. Never upload a `.env` file. Use a fresh random `JWT_SECRET` and a MongoDB user restricted to the MOVA database.
- Deploy the frontend from `client/` to Vercel with build command `npm run build`, output directory `dist`, and `VITE_API_URL` set to the deployed API URL ending in `/api`. Set `VITE_GOOGLE_CLIENT_ID` in the frontend build environment and rebuild after changing it.
- In Google Cloud Console, add the production frontend origin to authorized JavaScript origins. Set `APP_URL` to exactly that frontend origin (no path), and include it in the API `CLIENT_URL` CORS list.
- In MongoDB Atlas, allow network access only as required by the API host; do not use a wide-open database rule for production. Confirm backups and TLS are enabled.
- After deploy, verify `/api/health`, email/password registration and login, Google sign-in for an existing account, Google registration for a new business, and password recovery from an actual inbox.

### Authentication safeguards

- Passwords are hashed with bcrypt; new registrations and password resets require at least 8 characters.
- Password reset tokens are random, stored as SHA-256 hashes, expire after 15 minutes, and are invalidated after use. Resetting a password increments the user's token version to invalidate previously issued JWT sessions.
- Authentication endpoints have per-IP rate limits. The generic forgot-password response is designed not to reveal whether an email is registered.
- Registration validates email syntax on the API after normalization. Google ID tokens are verified against the configured audience, and Google must mark the account email as verified.

If an actual `.env` file or credential was ever committed to a repository or included in an archive shared outside your team, rotate those secrets immediately. Removing a file from the latest version does not remove it from Git history.

## Deployment checklist and smoke tests

See [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md) for step-by-step MongoDB Atlas, Render, Vercel, Google OAuth, SMTP, and production testing instructions. A root-level [`render.yaml`](./render.yaml) is included for Render Blueprint import.

After the API is deployed and configured, run `npm run smoke:auth` from `server/` with `API_BASE_URL` set to the API origin. These non-destructive checks verify health, safe rejection of missing Google credentials, generic password-recovery responses, and invalid reset-token rejection. Set `SMOKE_EMAIL` and `SMOKE_PASSWORD` to also verify an existing test login; the script never prints the password or session token.

### Seed an isolated trial store

After MongoDB connectivity is confirmed, run `npm run seed:trial` from `server/` with `MOVA_ENABLE_TRIAL_SEED=true` and `MOVA_TRIAL_SEED_CONFIRM_DB` set to the exact database name. The script creates a separate MOVA Trial Market business with two branches, seven role-based accounts, eight products with bundled image paths, customers, 120 sales and 60 received purchases across the latest 60 days, reconciled inventory movements, schedules, and closed cashier shifts. Existing businesses and records are left alone. It generates a random shared trial password unless `MOVA_TRIAL_PASSWORD` is supplied, and prints the credentials once on success.

For an existing business's two-month cashier demo, run `npm run seed:demo-operations -- <business-id>` from `server/` against the intended database. This resets both demo cashier passwords and prints both email/password pairs; set `MOVA_DEMO_CASHIER_PASSWORD` first if you need a known password. Share those demo credentials only with intended testers.
