// Personal data in a workspace is a JSON document, so Auth's foreign-key
// cascades cannot clean it. These pure transformations are used by account
// deletion and the daily guest retention job.

import { normalizeWorkspaceState } from "./planner.js";

export const GUEST_RETENTION_DAYS = 90;
export const BOOKING_RETENTION_DAYS = 90;

function withoutPeople(state, people, accountId = null) {
  const ids = new Set(people.map((person) => person.id));
  const names = people.map((person) => String(person.name || "").toLowerCase()).filter(Boolean);
  const draft = structuredClone(state);
  draft.members = draft.members.filter((person) => !ids.has(person.id));
  draft.removedMemberIds = [...new Set([...(draft.removedMemberIds || []), ...ids])];
  for (const id of ids) if (draft.guests) delete draft.guests[id];
  // The activity feed contains free-form messages with member names. Drop
  // entries naming a departing person; normalizing drops their votes, RSVP,
  // comments and plan authorship by member id.
  draft.activity = (draft.activity || []).filter((entry) =>
    !names.some((name) => String(entry.message || "").toLowerCase().includes(name))
  );
  if (accountId) {
    draft.hangouts = (draft.hangouts || []).map((entry) => ({
      ...entry,
      attendees: (entry.attendees || []).filter((id) => id !== accountId),
    }));
  }
  return normalizeWorkspaceState(draft);
}

/** Remove an account's member rows and transfer the technical manager field. */
export function removeAccountFromWorkspace(state, account) {
  const clean = normalizeWorkspaceState(state);
  const email = String(account?.email || "").trim().toLowerCase();
  const people = clean.members.filter((person) =>
    person.userId === account?.id || (email && person.pending && !person.userId && String(person.email || "").toLowerCase() === email)
  );
  if (!people.length && clean.ownerId !== account?.id) return { changed: false, state: clean, orphaned: false };
  const next = withoutPeople(clean, people, account.id);
  let orphaned = false;
  if (clean.ownerId === account.id) {
    const successor = next.members.find((person) => person.userId);
    if (successor) next.ownerId = successor.userId;
    else {
      delete next.ownerId;
      next.orphanedAt = new Date().toISOString();
      orphaned = true;
    }
  }
  return { changed: true, state: normalizeWorkspaceState(next), orphaned };
}

/** Expire a guest pass and their group contributions after inactivity. */
export function expireGuestData(state, now = new Date(), days = GUEST_RETENTION_DAYS) {
  const clean = normalizeWorkspaceState(state);
  const cutoff = now.getTime() - days * 86400000;
  const people = clean.members.filter((person) => {
    if (!person.guest || !clean.guests?.[person.id]) return false;
    const entry = clean.guests[person.id];
    const activity = Date.parse(entry.lastActiveAt || entry.joinedAt);
    return Number.isFinite(activity) && activity < cutoff;
  });
  return { expired: people.length, state: people.length ? withoutPeople(clean, people) : clean };
}

