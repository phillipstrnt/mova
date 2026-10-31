# MOVA on Northflank Sandbox

This directory contains a single-container build of the MOVA React/Vite client and Express API. It excludes `.env` files and Git metadata. MongoDB stays on the existing external MongoDB deployment; no database contents are copied by this app deployment.

## Free Sandbox target

Northflank currently lists a free Sandbox with two services, two jobs, one database, up to $20/month of included resources, and always-on services. The pricing page says no card is needed. Keep the project on the Sandbox plan, use one combined service, and do not add paid compute, BYOC, volumes, or add-ons. If the dashboard requests a card or offers a paid upgrade, stop before accepting it.

The Sandbox is described as suitable for hobby/testing, so it is a zero-cost recovery option, not a production uptime commitment.

## Deploy

Northflank builds from a Git repository. Put this sanitized source and Dockerfile in a repository connected to your Northflank account, then create a **Combined service** from that repository. Choose the root `Dockerfile`, use the free Sandbox resource setting, and expose port `8000` publicly over HTTP. The container listens on Northflank's injected `PORT` when provided.

Configure runtime values using Northflank's secret group for sensitive data:

- `MONGO_URI`: a newly rotated MongoDB URI for the existing MOVA database.
- `JWT_SECRET`: a new random signing secret (existing users will need to sign in again).
- `CLIENT_URL`: the exact public service origin once assigned.
- `GOOGLE_CLIENT_ID`: the public OAuth web client ID; add the service origin to its authorized JavaScript origins.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: needed for password-reset email.

Never commit secrets or `.env` files. The source checklist says prior credentials were exposed, so rotate them before deployment. After deployment, confirm `/api/health` reports the API and database healthy. Use MongoDB Atlas backups for data protection; the app's in-process timer is not a dependable backup scheduler on a free sandbox.
