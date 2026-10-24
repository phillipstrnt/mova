# MOVA POS release checklist

## Before deploying

- [ ] Rotate any credentials that were present in the originally shared archive's `server/.env`; do not reuse those values.
- [ ] Create/verify a production MongoDB database and a database user with least-privilege access.
- [ ] Generate a new random `JWT_SECRET` for production.
- [ ] Configure Google OAuth Web Client ID; add the exact production frontend origin to Authorized JavaScript origins.
- [ ] Configure SMTP sender and credentials; verify that password-reset emails arrive and are not marked as spam.
- [ ] Deploy the API from `server/` using `server/render.yaml` and set `MONGO_URI`, `CLIENT_URL`, `APP_URL`, `GOOGLE_CLIENT_ID`, and SMTP settings as host environment variables.
- [ ] Deploy the frontend from `client/` to Vercel, build command `npm run build`, output `dist`; set `VITE_API_URL` to `https://<api-host>/api` and `VITE_GOOGLE_CLIENT_ID` before building.
- [ ] Add the frontend origin to `CLIENT_URL` on the API and set `APP_URL` to one exact frontend origin.
- [ ] Verify the API health endpoint, email/password registration/login, Google login, first-time Google registration, forgot-password email delivery, expired/used reset links, and protected API routes.
- [ ] Confirm production uses HTTPS, MongoDB backups, and no `.env` files or credentials are deployed.

## Current release status (2026-10-24)

- Frontend lint exits successfully with existing warnings and the production build passes; the generated main JavaScript bundle is about 1.78 MB minified.
- Backend syntax checks pass. Windows resolves the Atlas SRV record, but Node startup currently fails with `querySrv ECONNREFUSED` in this execution environment, so the API does not listen and the seed/live auth checks cannot run here.
- GitHub, Render, and Vercel return successful HTTPS responses from this machine and load in the Codex browser. Chrome alone displays `ERR_CONNECTION_TIMED_OUT`; the Windows user proxy is disabled. The connected browser tool cannot inspect Chrome's profile, so a Chrome extension/profile or app-specific filter is the likely next place to check.
- The Render and Vercel dashboards are signed out in the available browser. GitHub's public site is reachable, but Git operations cannot authenticate because the Windows Git Credential Manager helper fails in this environment. No deploy has been triggered.
- `server/src/scripts/seedTrialDemo.js` is guarded and repeatable. It prepares 120 sales, 60 received purchases across Main and East branches for 60 days, supplier/customer/product records with bundled product image paths, reconciled stock movements, nine weekly cashier schedules per branch cashier, and 120 closed shift sessions. The seed has not been run, so no trial credentials have been generated.