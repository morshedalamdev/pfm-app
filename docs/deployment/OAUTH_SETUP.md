# Direct Google and GitHub OAuth setup

This project uses the FastAPI backend as the OAuth 2.0 client. It does not use
Auth0. The provider callback lands on the API, which later redirects the
browser to the frontend.

## Callback URLs

Google Web OAuth client:

```text
http://localhost:8000/api/v1/auth/oauth/google/callback
https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/google/callback
```

GitHub needs two OAuth Apps because an OAuth App supports one callback URL:

```text
Development: http://localhost:8000/api/v1/auth/oauth/github/callback
Production: https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/github/callback
```

## Google

1. Create a Web OAuth client in Google Cloud.
2. Configure the consent screen and add the production domain, homepage,
   privacy-policy URL, and support contact.
3. Use the `openid`, `email`, and `profile` scopes only.
4. Add both Google callback URLs above.
5. During development, keep the app in Testing and add testing Google
   accounts. Move it to production only after the consent-screen requirements
   are satisfied.

## GitHub

Create two OAuth Apps in GitHub Developer Settings:

| Environment | Homepage URL | Callback URL |
| --- | --- | --- |
| Development | `http://localhost:3000` | `http://localhost:8000/api/v1/auth/oauth/github/callback` |
| Production | `https://pfm.morshedalam.dev` | `https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/github/callback` |

The app will request only `read:user` and `user:email`.

## Secret handling

For local development, add the Google development credentials and GitHub
development credentials to the ignored `server/.env` file. For production,
set the production values in the Render service's Environment settings. Never
commit, paste into chat, or expose a client secret in the frontend.

Required keys:

```text
FRONTEND_BASE_URL
OAUTH_PUBLIC_API_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GITHUB_OAUTH_CLIENT_ID
GITHUB_OAUTH_CLIENT_SECRET
OAUTH_STATE_SECRET_KEY
OAUTH_REGISTRATION_TICKET_SECRET_KEY
OAUTH_REGISTRATION_TICKET_EXPIRE_MINUTES
OAUTH_LOGIN_EXCHANGE_EXPIRE_SECONDS
```

Generate the two local-only secret keys with a cryptographically secure random
generator. They must be unique, at least 32 bytes, and different from the JWT
access and refresh token secrets.
