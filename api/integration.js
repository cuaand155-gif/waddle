// A read-only, revocable LifeBoard feed for the account that issued a token.
// No workspace JSON, contact details, availability or comments leave this route.

import { createHash, randomBytes } from "node:crypto";
import { nextOccurrence } from "../lib/hangout.js";
import { normalizeHangouts } from "../lib/hangout-history.js";
import { bearer, config, restHeaders, send, userFromToken } from "./_supabase.js";

const TOKEN_RE = /^wdl_[A-Za-z0-9_-]{43}$/;
const TOKEN_DAYS = 180;
const PLAN_DAYS = 14;
const HANGOUT_DAYS = 90;
const PAGE_SIZE = 100;

const hashOf = (token) => createHash("sha256").update(token).digest("hex");

async function tokenUser(db, token) {
  if (!TOKEN_RE.test(token || "")) return null;
  const query = new URLSearchParams({
    select: "user_id,expires_at",
    token_hash: "eq." + hashOf(token),
    limit: "1",
  });
  const response = await fetch(db.url + "/rest/v1/integration_tokens?" + query, {
    headers: restHeaders(db.key),
  });
  if (!response.ok) throw new Error("token-read");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("token-read");
  const row = rows[0];
  return row && Date.parse(row.expires_at) > Date.now() ? row.user_id : null;
}

async function feed(db, userId, now = new Date()) {
  const plans = [];
  const hangouts = [];
  const until = now.getTime() + PLAN_DAYS * 86400000;
  const since = now.getTime() - HANGOUT_DAYS * 86400000;
  let after = "";
  for (;;) {
    const query = new URLSearchParams({
      select: "slug,state",
      state: "cs." + JSON.stringify({ members: [{ userId }] }),
      order: "slug.asc",
      limit: String(PAGE_SIZE),
    });
    if (after) query.set("slug", "gt." + after);
    const response = await fetch(db.url + "/rest/v1/workspaces?" + query, {
      headers: restHeaders(db.key),
    });
    if (!response.ok) throw new Error("groups-read");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("groups-read");
    for (const row of rows) {
      const state = row.state || {};
      // Recheck membership after decoding the document. The database filter
      // narrows the query, but the server owns the final authorization check.
      if (!Array.isArray(state.members) || !state.members.some((member) => member.userId === userId)) continue;
      const slug = String(row.slug || "");
      const group = String(state.name || slug).slice(0, 60);
      const path = "/g/" + encodeURIComponent(slug);
      const plan = state.plan;
      const occurrence = nextOccurrence(plan, now);
      if (occurrence && occurrence.end.getTime() > now.getTime() && occurrence.start.getTime() < until) {
        plans.push({
          id: slug + ":" + String(plan.id || "plan") + ":" + occurrence.start.toISOString(),
          slug, group, title: String(plan.activity || "Plan").slice(0, 80),
          start: occurrence.start.toISOString(), end: occurrence.end.toISOString(), path,
        });
      }
      for (const entry of normalizeHangouts(state.hangouts)) {
        const at = Date.parse(entry.at);
        if (entry.attendees.includes(userId) && at >= since && Date.parse(entry.end) <= now.getTime()) {
          hangouts.push({
            id: slug + ":" + entry.planId + ":" + entry.at,
            slug, group, at: entry.at, end: entry.end, path,
          });
        }
      }
    }
    if (rows.length < PAGE_SIZE) break;
    after = rows.at(-1).slug;
  }
  plans.sort((a, b) => a.start.localeCompare(b.start));
  hangouts.sort((a, b) => b.at.localeCompare(a.at));
  return { asOf: now.toISOString(), plans: plans.slice(0, 50), hangouts: hangouts.slice(0, 50) };
}

async function handle(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return send(response, 204, {});
  }
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return send(response, 405, { error: "Method not allowed" });
  }
  const db = config();
  if (!db) return send(response, 503, { error: "Integration storage is unavailable." });
  const token = bearer(request);
  if (request.method === "GET") {
    const userId = await tokenUser(db, token);
    if (!userId) return send(response, 401, { error: "This LifeBoard link is invalid or expired." });
    return send(response, 200, await feed(db, userId));
  }
  const userId = await userFromToken(db.url, db.key, token);
  if (!userId) return send(response, 401, { error: "Sign in to manage your LifeBoard link." });
  const filter = new URLSearchParams({ user_id: "eq." + userId });
  if (request.method === "DELETE") {
    const result = await fetch(db.url + "/rest/v1/integration_tokens?" + filter, {
      method: "DELETE", headers: restHeaders(db.key),
    });
    if (!result.ok) throw new Error("token-revoke");
    return send(response, 200, { revoked: true });
  }
  const newToken = "wdl_" + randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 86400000).toISOString();
  const query = new URLSearchParams({ on_conflict: "user_id" });
  const result = await fetch(db.url + "/rest/v1/integration_tokens?" + query, {
    method: "POST",
    headers: restHeaders(db.key, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({ user_id: userId, token_hash: hashOf(newToken), expires_at: expiresAt }),
  });
  if (!result.ok) throw new Error("token-save");
  return send(response, 201, { token: newToken, expiresAt });
}

export default async function handler(request, response) {
  try {
    return await handle(request, response);
  } catch (error) {
    console.error("integration feed failed:", error?.message || "Error");
    if (response.headersSent) return undefined;
    return send(response, 502, { error: "Could not reach integration storage." });
  }
}
