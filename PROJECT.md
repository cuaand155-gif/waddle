# Waddle project hub

Last reviewed: 2026-10-19, including legal and privacy issue spotting. Keep this page as the running to-do list: check off finished work, add new tasks where they belong, and update the date when reviewing it.

## What Waddle is

Waddle helps friends find time to meet. People can belong to multiple groups, share only the calendar details they choose, propose plans, vote on times, RSVP, and see past hangouts with friends. It is a vanilla JavaScript web app with Supabase for accounts/data and Vercel for hosting and API functions.

- [Source and issues](https://github.com/cuaand155-gif/waddle) · [Primary site](https://hangout-planner-omega.vercel.app) · [Second site](https://hangout-planner-cuacua.vercel.app)
- [Feature inventory and architecture](BLUEPRINT.md) · [Data inventory](DATA_INVENTORY.md) · [Public launch requirements](LAUNCH_READINESS.md) · [Deployment setup](DEPLOY.md) · [Privacy and product rules](CLAUDE.md)

## Next: launch foundations

These are ordered by dependency. The operator decisions belong to Alexi; app changes can follow them.

- [ ] **Choose Waddle's operator name and create a dedicated email.** Make an address for support and privacy requests, secure it with two-factor authentication, and decide who monitors it. A dedicated Gmail address works initially; move to `support@your-domain` after choosing a domain. Decide intended regions, minimum age/children approach, service jurisdiction, and who will answer data requests. Record the final operator name and address in the public policy, terms, Google consent screen, and app contact links. **Owner: Alexi.**
- [ ] **Choose and connect an owned domain.** Use it for Waddle's public site and, if desired, branded email. Verify ownership in Google Search Console. **Owner: Alexi for domain purchase and DNS access; implementation after that.**
- [ ] **Set and enforce retention periods from the [data inventory](DATA_INVENTORY.md).** Guests and booking visitors should have automatic expiry, without a separate removal form. Choose the period and anchor date for each, then add a scheduled cleanup and verify it. Also decide retention for pending requests, group history, notification logs, tokens, device copies and backups.
- [ ] **Implement account deletion and group management succession.** A group continues when an account closes, and management passes to another signed-in member. Decide what happens when there is no such member. Add a self-service account deletion path that removes the departing member's availability, comments, votes and history references, and test it with two accounts and a guest. “Reset this device” only clears local data. See [group governance](GROUP_GOVERNANCE.md).
- [ ] **Publish accurate privacy and storage information for the already-live site.** Explain each data flow, retention, processor, cross-border handling, contact and request path. Put a public HTML policy on the owned domain and link it from the homepage, sign-in, guest join, booking page and footer. Explain why a booking visitor's email is required even while confirmation email is off. Assess consent requirements for the actual audience and storage used. Do not add a generic cookie banner without a corresponding nonessential tracking choice.
- [ ] **Publish Waddle's terms.** Confirm jurisdiction, age rule, operator identity, and how invitations, shared plans, service availability, and account closure work. Link the final terms publicly and in sign-in.
- [ ] **Complete Google OAuth verification.** Set the verified domain, support email, homepage, policy and terms in Google Auth Platform; check the requested Calendar scope; then submit the brand and sensitive-scope review with a recording of the real consent and calendar flow. This is the path to removing the public “unverified app” warning. Temporary test-user access does not complete verification.
- [ ] **Run a real two-account production check.** Check sign-in, friend requests, calendar visibility and private events, a shared plan, its finished hangout count, and a booking link. Use authorized test accounts and avoid sending real booking emails or changing real calendars during development tests.
- [ ] **Decide sensitive-plan preview behavior.** Waddle now tells inviters that a chat app may show a group name or plan title. Decide whether live links for sensitive plans need an optional generic preview. Friend profiles already explain that a past plan counts after two Yes RSVPs; this does not prove attendance.
- [ ] **Run an accessibility acceptance check.** Check keyboard use, focus, screen-reader labels and contrast in sign-in, dialogs, guest join and booking, then fix failures before wider promotion.

## Decisions and provider setup

- [ ] **Phone sign-in:** choose an SMS provider and budget, then enable and test Supabase Phone Auth; or hide the text-code option until available. Friend requests by phone number already work separately from phone sign-in.
- [ ] **Booking email:** after domain and sender setup, configure Resend and `RESEND_API_KEY` / `BOOKING_EMAIL_FROM`, then test confirmations and cancellations with controlled addresses. Booking works without email.

## Later product work

- [ ] **Direct friend invite links:** let a person accept a friend-specific invitation without a group link; prevent reuse and avoid exposing contact details.
- [ ] **Optional contact-based suggestions:** research an explicit opt-in flow, browser support, matching method and privacy impact before uploading or matching an address book. The current Contact Picker selects one phone number for an SMS draft; it does not scan contacts or send a message.
- [ ] **More UI choices:** consider compact/comfortable density, Sunday/Monday week start, higher contrast/larger type, and a simpler mobile home view. Prioritize from user feedback.

## Already delivered

- [x] Multiple groups, multiple friends, friend requests, guest/group invite links, and one-on-one planning.
- [x] Friend profiles showing completed shared-plan dates and counts. A count rises after a plan ends when both friends RSVP Yes; older plans lost before history was added cannot be recovered.
- [x] Invite-by-text draft and single-contact picking on supported browsers. Waddle does not send the text automatically.
- [x] Google sign-in, optional Calendar connection, per-friend visibility controls, booking links, and push opt-in.
- [x] Auto/light/dark appearance and nine accent colours.
- [x] Both production URLs updated to the current app. The latest privacy changes passed 295 unit/API tests and 73 browser tests before deployment.
- [x] Profile names/photos are no longer readable by unrelated signed-in accounts; the live database policy is limited to account owners and friend-request parties.
- [x] Google disconnect checks that the server deleted its refresh token before reporting success; short-lived browser access tokens use session storage. Guest, invite and booking screens explain who can see submitted information.
- [x] A signed-in stranger with a group URL cannot read or overwrite the full group. A valid invite opens only the limited guest view.

## Keeping this current

Use [BLUEPRINT.md](BLUEPRINT.md) for detailed implementation status and [LAUNCH_READINESS.md](LAUNCH_READINESS.md) for policy and verification specifics. Update this list when a decision or feature changes; mark a box complete only when the live behavior or published page has been checked. Put implementation detail in those linked documents so this page stays short.
