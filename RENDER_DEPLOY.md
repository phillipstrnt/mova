# Recreate MOVA on Render

This branch includes a single Docker service for the Vite client and Express API. Render serves the client and API from one origin. The root `render.yaml` uses Render's free web-service plan and keeps secret values out of Git.

## Before creating a service

If Render suspended the existing account, contact Render Support first. Ask whether the suspension can be lifted and whether Render permits a replacement account. Do not use a new account to bypass a restriction. A new Render service does not restore the old account's settings or secrets.

The MOVA database is MongoDB Atlas and is separate from Render. This deployment reuses the existing database only if its account is accessible and a fresh connection string is configured.

## Create the service

After Render confirms you may use an account:

1. Sign in to the permitted Render account.
2. Create a Blueprint from the `phillipstrnt/mova` GitHub repository and select branch `codex/northflank-recovery`.
3. Select the root `render.yaml`. It creates one free web service from the root Dockerfile.
4. Keep the compute plan set to **Free**. Do not upgrade or add paid resources.
5. In Render's secret-value prompt, enter the new values for `MONGO_URI`, `GOOGLE_CLIENT_ID`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. `SMTP_PORT` and `SMTP_SECURE` have defaults. Render generates `JWT_SECRET`.
6. `CLIENT_URL` and `APP_URL` are set from the service's Render URL by the Blueprint.

Do not put secret values in GitHub or chat. Rotate any credentials that were previously exposed. Do not reuse the old MongoDB password, SMTP password, or JWT secret.

## MongoDB Atlas

Allow the new Render service's outbound IP ranges in Atlas Network Access, using the current ranges shown by Render for that service. Avoid allowing all IPs. The database itself is not copied by this deployment.

## After deployment

- Open `https://<your-service>.onrender.com/api/health` and confirm the API and database report healthy.
- Add the Render service origin to the Google OAuth client's authorized JavaScript origins.
- Check sign-in and password recovery. Password recovery requires valid SMTP settings.
- Keep the plan on Free. Render free web services can spin down after 15 minutes without inbound traffic, so the first request after idle may take about a minute.

For platform account or service suspension questions, contact [Render Support](https://render.com/contact).
