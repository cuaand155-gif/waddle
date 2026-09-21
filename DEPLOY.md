# Deploy Hangout Planner

Hangout Planner has no frontend build step, but it now uses a small serverless API for shared workspace state. Deploy the project folder as-is, with `index.html` at the site root.

## Connect persistence

1. Create a Supabase project.
2. Open [`supabase/schema.sql`](supabase/schema.sql) on GitHub, click **Raw**, copy the SQL contents, paste the contents into a new Supabase SQL Editor query, and click **Run**. Do not paste the filename or path itself (`supabase/schema.sql`) into the editor; that is not SQL.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-side environment variables in your host. Copy the names from [`.env.example`](.env.example); never expose the service-role key in browser code.
4. Redeploy. Without these variables, the UI intentionally falls back to demo data and does not persist changes between visitors.

The schema also includes profiles (display name, photo URL, and schedule visibility), friend requests, and calendar connection records. Calendar access must be implemented by a server-side `/api/calendar/connect` flow: exchange provider authorization codes on the server, encrypt refresh tokens, fetch events there, and return only normalized busy/free blocks. Do not request Google Calendar scope from the browser or store provider tokens in local storage. Apple Calendar is currently a labeled prototype state; production support should use a secure iCloud/CalDAV or calendar-feed service and never request an Apple ID password.

## Vercel

1. Push this folder to a Git provider, or run `vercel` from the project directory.
2. In Vercel, import the repository and choose the project root.
3. Leave **Framework Preset** as **Other**, leave **Build Command** blank, and leave **Output Directory** blank.
4. Deploy. The included `vercel.json` enables clean URLs without changing the app's design.

## Netlify

### From a Git repository

1. Choose **Add new site → Import an existing project**.
2. Select the repository and set **Publish directory** to `.`.
3. Leave **Build command** empty, then deploy.

### Manual upload

1. Open Netlify's deploy page.
2. Drag the project folder into the deploy area.
3. Netlify serves `index.html` automatically. The included `api/workspace.js` is Vercel-style; to make shared persistence work on Netlify, move that handler to a Netlify Function and update the browser endpoint. Otherwise, this app uses device-local fallback storage.

## GitHub Pages

1. Push the project files to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the publishing branch, and choose the `/ (root)` folder.
4. Save and wait for the Pages URL to appear.

GitHub Pages can host the frontend only. It cannot run the included serverless API, so it will use device-local fallback storage unless you host the API separately and update its URL in `app.js`. No rewrite configuration is required for the current hash routes.

## Google sign-in setup

The account entry point and **Continue with Google** action use Supabase Auth. The public Supabase URL and publishable key are browser-safe; Google provider credentials remain in Supabase and are never placed in this repository.

For a static site or Vercel deployment, [Supabase Auth](https://supabase.com/docs/guides/auth/social-login/auth-google) is the recommended next step:

1. Create a Supabase project and copy its **Project URL** and **anon public key**.
2. In Supabase Authentication → Providers → Google, add the Google OAuth **Client ID** and **Client Secret** from Google Cloud Console. Add the deployed site URL to Supabase's redirect allow list.
3. The static page already loads the Supabase browser client from jsDelivr and `app.js` already wires `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })` plus session updates to the existing account UI.
4. Replace the placeholder values in `AUTH_CONFIG` with:

   ```js
   const AUTH_CONFIG = {
     provider: "supabase",
     configured: true,
     supabaseUrl: "https://<project-ref>.supabase.co",
     supabaseAnonKey: "<supabase-anon-public-key>",
     redirectUrl: window.location.origin,
   };
   ```

   For Vercel, store the same values as `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables and expose them through the static build/config step. Never put a Supabase service-role key or Google client secret in browser code.
5. Subscribe to `supabase.auth.onAuthStateChange` and update the account dialog/profile from the returned session. Keep the signed-out state as the fallback when there is no session.

Google account sign-in is separate from calendar access. The browser uses Supabase Auth for the user session, while Google Calendar credentials and synchronization must remain on the server. The current UI reports a backend-unavailable state until `/api/calendar/connect` and the corresponding refresh/disconnect handlers are backed by a real token store. The included endpoint intentionally returns `501` until configured; it does not claim that a calendar is live merely because a user signed in.

## Calendar backend requirements

Before enabling live synchronization, implement the server-side calendar layer behind the existing API boundary:

- Google: complete the OAuth authorization-code exchange on the server, store encrypted refresh tokens keyed to the authenticated Supabase user, fetch selected calendars through the Google Calendar API, and normalize events to busy/free intervals.
- Apple: use a server-side iCloud/CalDAV integration or a read-only calendar-feed workflow. Never ask for or store an Apple ID password, and never use EventKit in this web app.
- Provider controls: implement connect, refresh, reconnect, disconnect, and selected-calendar endpoints. Return only calendar names/IDs needed for selection and busy/free blocks for availability; never return event titles, descriptions, attendees, locations, notes, or meeting links.
- Suggested server environment values: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CALENDAR_TOKEN_ENCRYPTION_KEY`, and the provider-specific Apple/CalDAV service credentials. Keep all of them server-only.

Until this backend is implemented, the Google card is an integration-ready connection state and the Apple card is a clearly labeled prototype flow.

## Local preview

From this directory, run:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. Stop the server with `Ctrl+C`.
