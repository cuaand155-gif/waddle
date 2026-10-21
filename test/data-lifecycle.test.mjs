import test from "node:test";
import assert from "node:assert/strict";

import { expireGuestData, removeAccountFromWorkspace } from "../lib/data-lifecycle.js";
import { addGuest, hashToken, newInviteCode } from "../lib/guests.js";
import { normalizeWorkspaceState } from "../lib/planner.js";
import accountHandler from "../api/account.js";
import cronHandler from "../api/cron.js";
import workspaceHandler from "../api/workspace.js";
import { createFakeSupabase, installFakeSupabase } from "../scripts/fake-supabase.mjs";

const ALEXI = "11111111-1111-1111-1111-111111111111";
const SAM = "22222222-2222-2222-2222-222222222222";
const old = "2026-01-01T12:00:00.000Z";
const now = new Date("2026-10-21T12:00:00.000Z");

function group() {
  return normalizeWorkspaceState({
    name: "Friends", ownerId: ALEXI,
    members: [
      { id: "alexi", name: "Alexi", userId: ALEXI, email: "alexi@example.com" },
      { id: "sam", name: "Sam", userId: SAM },
    ],
    ideas: [{ id: "idea", title: "Walk", votes: ["alexi", "sam"] }],
    plan: { id: "plan", activity: "Dinner", createdBy: "alexi", chosenBy: "alexi", chosen: "2026-01-01T12:00:00Z", comments: [
      { id: "one", memberId: "alexi", text: "My private note", at: old },
      { id: "two", memberId: "sam", text: "I'll bring dessert", at: old },
    ], rsvp: { at: old, answers: { alexi: "yes", sam: "yes" } }, timeVotes: { [old]: ["alexi", "sam"] } },
    hangouts: [{ planId: "plan", at: old, end: "2026-01-01T14:00:00Z", attendees: [ALEXI, SAM] }],
    activity: [{ message: "Alexi proposed dinner", at: old }, { message: "Sam voted", at: old }],
  });
}

function response() {
  const out = { status: 0, body: null };
  return { out, setHeader() {}, status(code) { out.status = code; return this; }, json(body) { out.body = body; return this; } };
}

test("account cleanup preserves a group while removing the departed person's references", () => {
  const cleaned = removeAccountFromWorkspace(group(), { id: ALEXI, email: "alexi@example.com" });
  assert.equal(cleaned.changed, true);
  assert.equal(cleaned.orphaned, false);
  assert.equal(cleaned.state.ownerId, SAM);
  assert.deepEqual(cleaned.state.members.map((person) => person.userId), [SAM]);
  assert.equal(cleaned.state.plan.comments.length, 1);
  assert.equal(cleaned.state.plan.comments[0].text, "I'll bring dessert");
  assert.deepEqual(cleaned.state.ideas[0].votes, ["sam"]);
  assert.deepEqual(cleaned.state.hangouts[0].attendees, [SAM]);
  assert.doesNotMatch(JSON.stringify(cleaned.state), /My private note|alexi@example.com|11111111-1111-1111-1111-111111111111/);
});

test("last account can be removed without deleting the group", () => {
  const original = { ...group(), members: group().members.slice(0, 1) };
  const cleaned = removeAccountFromWorkspace(original, { id: ALEXI });
  assert.equal(cleaned.orphaned, true);
  assert.equal(cleaned.state.ownerId, undefined);
  assert.equal(cleaned.state.name, "Friends");
});

test("inactive guest data expires, while recent guest data remains", async () => {
  const hash = await hashToken("a".repeat(48));
  const first = addGuest(group(), { name: "Casey", hash, now: new Date(old) });
  const state = first.state;
  const guest = state.members.find((person) => person.id === first.memberId);
  guest.updatedAt = old;
  guest.updatedAt = "2027-01-01T12:00:00Z"; // A member can edit this field; it must not delay expiry.
  state.plan.comments.push({ id: "guest", memberId: guest.id, text: "Guest note", at: old });
  const expired = expireGuestData(state, now);
  assert.equal(expired.expired, 1);
  assert.equal(expired.state.guests?.[guest.id], undefined);
  assert.equal(expired.state.members.some((person) => person.id === guest.id), false);
  assert.doesNotMatch(JSON.stringify(expired.state), /Casey|Guest note/);
  state.guests[guest.id].lastActiveAt = "2026-10-01T12:00:00Z";
  assert.equal(expireGuestData(state, now).expired, 0);
});

test("DELETE /api/account requires the caller and keeps their group for Sam", async (t) => {
  const fake = createFakeSupabase({ tables: {
    workspaces: [{ slug: "friends", state: group(), updated_at: old }],
    friend_requests: [{ id: "r1", requester_id: SAM, recipient_email: "alexi@example.com", status: "pending" }],
  } });
  const restore = installFakeSupabase(fake);
  t.after(restore);
  const denied = response();
  await accountHandler({ method: "DELETE", headers: {} }, denied);
  assert.equal(denied.out.status, 401);
  const deleted = response();
  await accountHandler({ method: "DELETE", headers: { authorization: "Bearer fake-token" } }, deleted);
  assert.equal(deleted.out.status, 200);
  assert.equal(deleted.out.body.deleted, true);
  assert.equal(fake.db.workspaces[0].state.ownerId, SAM);
  assert.equal(fake.db.friend_requests.length, 0);
  assert.equal(fake.users["fake-token"], undefined);
  assert.ok(fake.users["fake-token-sam"]);
});

test("a guest can take over a group left without signed-in members", async (t) => {
  const token = "c".repeat(48);
  const code = newInviteCode();
  const solo = normalizeWorkspaceState({
    name: "Friends", ownerId: ALEXI, invite: { code },
    members: [{ id: "alexi", name: "Alexi", userId: ALEXI }],
  });
  const { state, memberId } = addGuest(solo, { name: "Casey", hash: await hashToken(token) });
  const fake = createFakeSupabase({ tables: { workspaces: [{ slug: "friends", state, updated_at: old }] } });
  const restore = installFakeSupabase(fake);
  t.after(restore);
  const deletion = response();
  await accountHandler({ method: "DELETE", headers: { authorization: "Bearer fake-token" } }, deletion);
  assert.equal(deletion.out.status, 200);
  assert.equal(deletion.out.body.groupsWithoutManager, 1);
  assert.equal(fake.db.workspaces[0].state.ownerId, undefined);
  const lateToken = "d".repeat(48);
  const lateJoin = response();
  await workspaceHandler({ method: "POST", query: { slug: "friends" }, headers: {}, body: { action: "guest-join", invite: code, token: lateToken, name: "Late arrival" } }, lateJoin);
  assert.equal(lateJoin.out.status, 201);
  const lateClaim = response();
  await workspaceHandler({ method: "POST", query: { slug: "friends" }, headers: { authorization: "Bearer fake-token-sam" }, body: { action: "manager-claim", invite: code, token: lateToken } }, lateClaim);
  assert.equal(lateClaim.out.status, 403);
  const claim = response();
  await workspaceHandler({ method: "POST", query: { slug: "friends" }, headers: { authorization: "Bearer fake-token-sam" }, body: { action: "manager-claim", invite: code, token } }, claim);
  assert.equal(claim.out.status, 200);
  assert.equal(claim.out.body.state.ownerId, SAM);
  assert.equal(claim.out.body.state.members.find((person) => person.id === memberId).userId, SAM);
  assert.equal(fake.db.workspaces[0].state.guests?.[memberId], undefined);
});

test("a workspace save cannot restore a member removed by account deletion", async (t) => {
  const original = group();
  const fake = createFakeSupabase({ tables: { workspaces: [{ slug: "friends", state: original, updated_at: old }] } });
  const restore = installFakeSupabase(fake);
  t.after(restore);
  const deletion = response();
  await accountHandler({ method: "DELETE", headers: { authorization: "Bearer fake-token" } }, deletion);
  assert.equal(deletion.out.status, 200);
  const stale = response();
  await workspaceHandler({ method: "PUT", query: { slug: "friends" }, headers: { authorization: "Bearer fake-token-sam" }, body: { state: original } }, stale);
  assert.equal(stale.out.status, 409);
  assert.deepEqual(fake.db.workspaces[0].state.members.map((member) => member.id), ["sam"]);
});

test("a failed group scrub leaves the sign-in account active", async (t) => {
  const fake = createFakeSupabase({ tables: { workspaces: [{ slug: "friends", state: group(), updated_at: old }] } });
  const original = fake.fetch;
  fake.fetch = (url, options) => options?.method === "PATCH" && String(url).includes("/workspaces?")
    ? Promise.resolve(new Response(JSON.stringify({ error: "database error" }), { status: 500 }))
    : original(url, options);
  const restore = installFakeSupabase(fake);
  t.after(restore);
  const result = response();
  await accountHandler({ method: "DELETE", headers: { authorization: "Bearer fake-token" } }, result);
  assert.equal(result.out.status, 502);
  assert.ok(fake.users["fake-token"]);
  assert.equal(fake.db.workspaces[0].state.ownerId, ALEXI);
});

test("daily retention removes old bookings and guest passes", async (t) => {
  const hash = await hashToken("b".repeat(48));
  const { state, memberId } = addGuest(group(), { name: "Casey", hash, now: new Date(old) });
  state.members.find((person) => person.id === memberId).updatedAt = old;
  const fake = createFakeSupabase({ tables: {
    workspaces: [{ slug: "friends", state, updated_at: old }],
    bookings: [
      { id: "old", status: "confirmed", end_at: old },
      { id: "cancelled", status: "cancelled", cancelled_at: old, end_at: "2027-01-01T12:00:00Z" },
      { id: "recent", status: "confirmed", end_at: "2027-01-01T12:00:00Z" },
    ],
    notification_log: [{ key: "old", created_at: old }, { key: "recent", created_at: "2027-01-01T12:00:00Z" }],
  } });
  const restore = installFakeSupabase(fake);
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-retention-secret";
  t.after(() => { restore(); if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
  // The route uses the real clock; these 2026-01 records are already old.
  const result = response();
  await cronHandler({ method: "POST", query: { job: "retention" }, headers: { authorization: "Bearer test-retention-secret" } }, result);
  assert.equal(result.out.status, 200);
  assert.deepEqual(fake.db.bookings.map((row) => row.id), ["recent"]);
  assert.deepEqual(fake.db.notification_log.map((row) => row.key), ["recent"]);
  assert.equal(fake.db.workspaces[0].state.members.some((person) => person.id === memberId), false);
});
