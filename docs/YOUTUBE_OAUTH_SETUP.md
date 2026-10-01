# YouTube OAuth setup

Social Media Manager uses Google OAuth 2.0 for YouTube account access and publishing. An API key alone is not sufficient.

## Google Cloud

1. Create or select a Google Cloud project.
2. Enable:
   - YouTube Data API v3
   - YouTube Analytics API
3. Configure Google Auth Platform / OAuth consent screen.
4. Create an OAuth client with application type **Web application**.
5. Add the exact production callback URI from `GOOGLE_REDIRECT_URI` to **Authorized redirect URIs**.
6. If the app is in Testing, add every Google account that will connect a YouTube channel as a test user.

## Server settings

Configure these values only on the backend/server environment. Never expose the client secret to frontend code.

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.example/api/oauth/google/callback/
```

The YouTube OAuth flow requests:

- `https://www.googleapis.com/auth/youtube.force-ssl`
- `https://www.googleapis.com/auth/yt-analytics.readonly`
- `openid`
- `email`
- `profile`

`youtube.force-ssl` is required because the application publishes videos, not only reads channel data.

## Readiness check

After updating the deployment environment and restarting the backend, run:

```bash
python manage.py check_oauth_readiness
```

For automation/CI:

```bash
python manage.py check_oauth_readiness --json
python manage.py check_oauth_readiness --strict
```

The command deliberately reports only:

- whether Google/YouTube OAuth is configured;
- names of missing settings;
- the callback URI;
- required APIs and scopes.

It never prints `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` values.

## Connecting a channel

Once readiness is `READY`, open Connected Accounts and connect YouTube. The server will redirect to Google, exchange the authorization code for access/refresh tokens, discover the authenticated YouTube channel, and store the channel ID/name with the platform credential.

If the channel was connected before publishing scopes were enabled, disconnect it and reconnect so Google grants the current scopes.
