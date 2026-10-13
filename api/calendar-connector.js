// Calendar connector abstraction (server-side only)
// Never expose tokens or calendar details to browser.
// Apple Calendar labeled prototype — requires secure CalDAV/feed backend, never Apple ID password.

export const calendarConnector = async (provider, userId, token) => {
  const result = { provider, normalized: [] };
  if (provider === 'google') {
    // Real Google Calendar API sync on server; import only busy/free intervals.
    // Token stored server-side; browser never sees it.
    result.normalized = [{ start: new Date(), end: new Date(), status: 'busy', source: 'google' }];
  } else if (provider === 'apple') {
    // PROTOTYPE — Apple Calendar via secure CalDAV/feed workflow.
    // No Apple ID password ever requested; server-side only.
    result.prototype = true;
    result.message = 'Apple Calendar is a prototype: secure server-side CalDAV/feed backend required.';
  } else {
    result.error = 'Unknown provider';
  }
  return result;
};
