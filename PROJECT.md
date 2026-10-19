# Waddle project hub

Last reviewed: 2026-10-19. Keep this page as the running to-do list: check off finished work, add new tasks where they belong, and update the date when reviewing it.

## What Waddle is

Waddle helps friends find time to meet. People can belong to multiple groups, share only the calendar details they choose, propose plans, vote on times, RSVP, and see past hangouts with friends. It is a vanilla JavaScript web app with Supabase for accounts/data and Vercel for hosting and API functions.

- [Source and issues](https://github.com/cuaand155-gif/waddle) · [Primary site](https://hangout-planner-omega.vercel.app) · [Second site](https://hangout-planner-cuacua.vercel.app)
- [Feature inventory and architecture](BLUEPRINT.md) · [Public launch requirements](LAUNCH_READINESS.md) · [Deployment setup](DEPLOY.md) · [Privacy and product rules](CLAUDE.md)

## Next: launch foundations

These are ordered by dependency. The operator decisions belong to Alexi; app changes can follow them.

- [ ] **Choose Waddle's operator name and create a dedicated email.** Make an address for support and privacy requests, secure it with two-factor authentication, and decide who monitors it. A dedicated Gmail address works initially; move to `support@your-domain` after choosing a domain. Record the final operator name and address in the public policy, terms, Google consent screen, and app contact links. **Owner: Alexi.**
- [ ] **Choose and connect an owned domain.** Use it for Waddle's public site and, if desired, branded email. Verify ownership in Google Search Console. **Owner: Alexi for domain purchase and DNS access; implementation after that.**
- [ ] **Define and implement account deletion.** Decide what happens to owned groups, friend links, bookings, tokens, push subscriptions, retained backups, and data held by other group members. Add a discoverable deletion flow and verify it with two accounts. The current “Reset this device” only clears local data.
- [ ] **Publish accurate privacy and storage information.** Cover account, friend, group, calendar, booking, push, and local device data; processors; retention; deletion; and contact details. Put a public HTML policy on the owned domain and link it from the homepage and sign-in screen. Assess consent requirements for the actual audience and storage used. Do not add a generic cookie banner without a corresponding nonessential tracking choice.
- [ ] **Publish Waddle's terms.** Confirm jurisdiction, age rule, operator identity, and how invitations, shared plans, service availability, and account closure work. Link the final terms publicly and in sign-in.
- [ ] **Complete Google OAuth verification.** Set the verified domain, support email, homepage, policy and terms in Google Auth Platform; check the requested Calendar scope; then submit the brand and sensitive-scope review with a recording of the real consent and calendar flow. This is the path to removing the public “unverified app” warning. Temporary test-user access does not complete verification.
- [ ] **Run a real two-account production check.** Check sign-in, friend requests, calendar visibility and private events, a shared plan, its finished hangout count, and a booking link. Use authorized test accounts and avoid sending real booking emails or changing real calendars during development tests.

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
- [x] Both production URLs updated to the current app. At the last feature release, 293 unit/API tests and 72 browser tests passed.

## Keeping this current

Use [BLUEPRINT.md](BLUEPRINT.md) for detailed implementation status and [LAUNCH_READINESS.md](LAUNCH_READINESS.md) for policy and verification specifics. Update this list when a decision or feature changes; mark a box complete only when the live behavior or published page has been checked. Put implementation detail in those linked documents so this page stays short.
