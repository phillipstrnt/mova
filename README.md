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
- Set the API's `CLIENT_URL` to the deployed frontend origin so browser requests pass CORS. Rebuild the frontend whenever its `VITE_*` settings change.
