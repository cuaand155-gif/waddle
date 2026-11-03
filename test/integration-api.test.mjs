import test from "node:test";
import assert from "node:assert/strict";

import handler from "../api/integration.js";
import { createFakeSupabase, installFakeSupabase } from "../scripts/fake-supabase.mjs";

const ALEXI = "11111111-1111-1111-1111-111111111111";
const SAM = "22222222-2222-2222-2222-222222222222";

function response() {
  const out = { status: 0, body: null, headers: {} };
  return { out, setHeader(name, value) { out.headers[name] = value; },
    status(code) { out.status = code; return this; }, json(body) { out.body = body; return this; } };
}

async function call(method, token) {
  const res = response();
  await handler({ method, headers: token ? { authorization: "Bearer " + token } : {} }, res);
  return res.out;
}

test("LifeBoard feed uses one revocable account token and returns only that account's summaries", async (t) => {
  const now = Date.now();
  const future = new Date(now + 86400000).toISOString();
  const past = new Date(now - 2 * 86400000).toISOString();
  const pastEnd = new Date(now - 2 * 86400000 + 7200000).toISOString();
  const fake = createFakeSupabase({ tables: { workspaces: [
    { slug: "friends", state: { name: "Friends", members: [
      { id: "alexi", name: "Alexi", userId: ALEXI, email: "secret@example.com" },
      { id: "sam", name: "Sam", userId: SAM },
    ], plan: { id: "p1", activity: "Dinner", chosen: future, comments: [{ text: "private note" }] },
      hangouts: [{ planId: "p0", at: past, end: pastEnd, attendees: [ALEXI, SAM] }],
      guests: { visitor: { hash: "hidden" } } }, updated_at: new Date().toISOString() },
    { slug: "other", state: { name: "Other", members: [{ id: "sam", userId: SAM }],
      plan: { id: "p2", activity: "Sam secret", chosen: future } }, updated_at: new Date().toISOString() },
  ] } });
  const restore = installFakeSupabase(fake);
  t.after(restore);

  assert.equal((await call("GET")).status, 401);
  assert.equal((await call("POST")).status, 401);
  const issued = await call("POST", "fake-token");
  assert.equal(issued.status, 201);
  assert.match(issued.body.token, /^wdl_[A-Za-z0-9_-]{43}$/);
  assert.equal(fake.db.integration_tokens.length, 1);
  assert.doesNotMatch(JSON.stringify(fake.db.integration_tokens), /wdl_/);
  assert.equal(fake.db.integration_tokens[0].user_id, ALEXI);

  const feed = await call("GET", issued.body.token);
  assert.equal(feed.status, 200);
  assert.equal(feed.out?.headers?.["Cache-Control"], undefined);
  assert.equal(feed.headers["Cache-Control"], "no-store");
  assert.deepEqual(feed.body.plans.map((plan) => plan.title), ["Dinner"]);
  assert.equal(feed.body.plans[0].path, "/g/friends");
  assert.deepEqual(feed.body.hangouts.map((entry) => entry.group), ["Friends"]);
  assert.doesNotMatch(JSON.stringify(feed.body), /secret@example.com|private note|Sam secret|hidden|22222222/);

  const rotated = await call("POST", "fake-token");
  assert.equal(rotated.status, 201);
  assert.equal(fake.db.integration_tokens.length, 1);
  assert.equal((await call("GET", issued.body.token)).status, 401);
  assert.equal((await call("GET", rotated.body.token)).status, 200);
  assert.equal((await call("DELETE", "fake-token")).status, 200);
  assert.equal((await call("GET", rotated.body.token)).status, 401);
});

test("expired token cannot open the feed", async (t) => {
  const fake = createFakeSupabase({ tables: { workspaces: [] } });
  const restore = installFakeSupabase(fake);
  t.after(restore);
  const issued = await call("POST", "fake-token");
  fake.db.integration_tokens[0].expires_at = "2020-01-01T00:00:00Z";
  assert.equal((await call("GET", issued.body.token)).status, 401);
});
