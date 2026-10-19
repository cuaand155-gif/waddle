# Waddle public launch checklist

Checked 2026-10-19 against the app and the linked primary-source guidance. This is a product checklist, not a published policy or legal advice. Do not submit a template policy to Google: its policy must describe Waddle's real practices and identify its operator.

## Ready in the app

- The account dialog and group gate already support Google sign-in. The same flow creates an account for a new user. Google Calendar is requested separately from basic sign-in, when the user chooses Connect in Calendar links.
- A guest can join from an invite with just a name. The demo group works without an account.
- Settings have Auto, Light and Dark appearance plus nine accent colours, saved on the device.
- There is no advertising or client analytics tag in the app. Aggregate server metrics in `api/_metrics.js` have no user IDs or cookies. The app does use local storage for login sessions, preferences, calendar cache and group state, and a service worker for offline use. Third-party services include Supabase, Google sign-in/Calendar, Vercel and Google Fonts. Push notifications and booking emails are optional features.

## Before a public launch

1. **Get an operator identity and contact.** Decide whose name or organization runs Waddle, buy/choose a domain under that operator's control, and make a support/privacy email address. Use the same identity in the site, policy, Google consent screen and support replies. A dedicated Gmail address can be used while domain email is being set up.
2. **Publish a Waddle-specific privacy policy on the verified domain.** It needs to say what account, group, friend, calendar, booking, push and device data is collected; what Google data is accessed; why and where each kind is stored; who receives it; how long it is retained; how to disconnect Google, delete the account/data, and contact the operator. Link it from the public homepage, sign-in surface and app footer. Review the actual retention and deletion behavior before promising anything. Google requires a public HTML page and will not accept a sample/template policy.
3. **Publish terms appropriate to the chosen operator and jurisdiction.** Cover accounts, invitations and user content, permitted use, availability of a free service, responsibility for shared plans, ending service, and how to contact the operator. The operator must choose jurisdiction and any age rule before publication.
4. **Add an account deletion path.** “Reset this device” only clears local data. Waddle needs a way to request or perform deletion of the Supabase account and associated data, including group ownership, shares, bookings, push subscriptions and Google refresh tokens. Define retention and backup handling before writing the policy.
5. **Decide the storage notice from the deployment's actual technologies and audience.** Document essential login/session and preference storage in the privacy/storage notice. If Waddle introduces nonessential analytics, advertising or other tracking, add the appropriate consent control before loading it. A generic banner that says “accept cookies” without corresponding controls would be misleading. UK rules cover local storage as well as HTTP cookies and provide limited exceptions for strictly necessary storage.
6. **Finish Google OAuth verification to remove the unverified-app warning for public users.** In Google Auth Platform, set the verified domain, app name, support email, homepage, privacy policy and (when available) terms URL. The homepage must be public and explain Waddle and the Google data request. Verify site ownership in Search Console using an account with access to the Cloud project. Check that requested scopes are the narrowest needed; Waddle currently requests `calendar.readonly` only on Calendar connection. Submit the app for brand and sensitive-scope verification with an end-to-end video showing consent and the Calendar feature. Test users are a temporary way to use an app in testing; they do not remove the warning for a public rollout.
7. **Resolve the disabled phone path.** The UI offers a texted code, but live Supabase Phone Auth has no SMS provider. Either configure and test one or hide the choice before public promotion.
8. **Run a real two-account check** using the production domain and real consent screens after verification. Keep development tests on fakes; do not send test emails or alter real calendars.

## References

- Google: [OAuth verification requirements](https://support.google.com/cloud/answer/13464321), [app homepage requirements](https://support.google.com/cloud/answer/13807376), [privacy policy requirements](https://support.google.com/cloud/answer/13806988), [sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification).
- Office of the Privacy Commissioner of Canada: [PIPEDA openness](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_openness/) and [consent](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/).
- UK ICO: [storage and access technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/) and [exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/).

## Possible next UI controls

- Compact or comfortable density for the week grid and cards.
- Week starts Sunday or Monday, separate from time-zone settings.
- Higher-contrast surfaces and larger text for accessibility.
- A simplified mobile home view focused on the next plan and RSVP.

These are proposals. Colour and appearance choices are already implemented.
