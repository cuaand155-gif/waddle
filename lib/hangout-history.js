// Attendance snapshots are saved when a plan's RSVP changes. A snapshot only
// counts as a hangout once its end has passed and both friends answered Yes.

import { nextOccurrence } from "./hangout.js";

export const HANGOUT_LIMIT = 200;

const validDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
const recordKey = (entry) => `${entry.planId}:${entry.at}`;

export function normalizeHangouts(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, HANGOUT_LIMIT).flatMap((entry) => {
    if (!entry || typeof entry.planId !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(entry.planId) || !validDate(entry.at) || !validDate(entry.end) || Date.parse(entry.end) <= Date.parse(entry.at)) return [];
    const key = recordKey(entry);
    if (seen.has(key)) return [];
    seen.add(key);
    const attendees = [...new Set((Array.isArray(entry.attendees) ? entry.attendees : []).filter((id) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id)))].slice(0, 40);
    return [{ planId: entry.planId, at: new Date(entry.at).toISOString(), end: new Date(entry.end).toISOString(), attendees }];
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function snapshot(plan, members) {
  if (!plan?.id || !validDate(plan.rsvp?.at) || !plan.chosen) return null;
  const at = new Date(plan.rsvp.at);
  const occurrence = nextOccurrence(plan, new Date(at.getTime() - 1));
  if (!occurrence || occurrence.start.getTime() !== at.getTime() || occurrence.end - occurrence.start > 24 * 60 * 60 * 1000) return null;
  const yes = new Set(Object.entries(plan.rsvp.answers || {}).filter(([, answer]) => answer === "yes").map(([id]) => id));
  const attendees = [...new Set(members.filter((member) => yes.has(member.id) && member.userId).map((member) => member.userId))];
  return { planId: plan.id, at: at.toISOString(), end: occurrence.end.toISOString(), attendees };
}

export function recordHangouts(history, previousPlan, nextPlan, members, now = new Date()) {
  let entries = normalizeHangouts(history);
  const previous = snapshot(previousPlan, members);
  const current = snapshot(nextPlan, members);
  // A future plan that was moved, removed or had its RSVP changed has not
  // happened. Past records remain even after the group starts another plan.
  if (previous && (!current || recordKey(previous) !== recordKey(current)) && Date.parse(previous.end) > now.getTime()) {
    entries = entries.filter((entry) => recordKey(entry) !== recordKey(previous));
  }
  if (current) {
    entries = entries.filter((entry) => recordKey(entry) !== recordKey(current));
    if (current.attendees.length) entries.push(current);
  }
  return normalizeHangouts(entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
}

export function completedTogether(history, ownId, friendId, now = new Date()) {
  return normalizeHangouts(history).filter((entry) =>
    Date.parse(entry.end) <= now.getTime() && entry.attendees.includes(ownId) && entry.attendees.includes(friendId)
  );
}

/** A workspace save may change only the signed-in member's own RSVP. */
export function mergeMemberRsvp(previousPlan, nextPlan, memberId) {
  const current = nextPlan?.rsvp;
  if (!current) return undefined;
  const sameOccurrence = previousPlan?.id === nextPlan.id && previousPlan?.rsvp?.at === current.at;
  const answers = sameOccurrence ? { ...previousPlan.rsvp.answers } : {};
  if (memberId && current.answers?.[memberId]) answers[memberId] = current.answers[memberId];
  else if (memberId) delete answers[memberId];
  return { at: current.at, answers };
}
