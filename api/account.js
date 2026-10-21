// Self-service account deletion. The account comes only from the verified
// Supabase bearer token. Workspace JSON must be scrubbed before Auth deletion;
// other user-linked tables then cascade through their foreign keys.

import { removeAccountFromWorkspace } from "../lib/data-lifecycle.js";
import { accountFromToken, bearer, config, restHeaders, send } from "./_supabase.js";
import { updateRow } from "./_store.js";

const PAGE_SIZE = 100;

async function groupSlugs(db, column, filter) {
  const slugs = [];
  let after = "";
  for (;;) {
    const query = new URLSearchParams({ select: "slug", [column]: filter, order: "slug.asc", limit: String(PAGE_SIZE) });
    if (after) query.set("slug", `gt.${after}`);
    const result = await fetch(`${db.url}/rest/v1/workspaces?${query}`, { headers: restHeaders(db.key) });
    if (!result.ok) throw new Error("group-list");
    const page = await result.json();
    if (!Array.isArray(page)) throw new Error("group-list");
    slugs.push(...page.map((row) => row.slug));
    if (page.length < PAGE_SIZE) return slugs;
    after = page.at(-1).slug;
  }
}

async function affectedGroups(db, account) {
  const lookups = [
    groupSlugs(db, "state", `cs.${JSON.stringify({ members: [{ userId: account.id }] })}`),
    groupSlugs(db, "state->>ownerId", `eq.${account.id}`),
  ];
  if (account.email) lookups.push(groupSlugs(db, "state", `cs.${JSON.stringify({ members: [{ email: account.email, pending: true }] })}`));
  return [...new Set((await Promise.all(lookups)).flat())];
}

async function dropUnclaimedInvites(db, account) {
  const filters = [];
  if (account.email) filters.push(["recipient_email", `eq.${account.email}`]);
  if (account.phone) filters.push(["recipient_phone", `eq.+${account.phone.replace(/\D/g, "")}`]);
  for (const [column, filter] of filters) {
    const result = await fetch(`${db.url}/rest/v1/friend_requests?${new URLSearchParams({ [column]: filter })}`, {
      method: "DELETE", headers: restHeaders(db.key),
    });
    if (!result.ok) throw new Error("friend-invites");
  }
}

async function handle(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "DELETE, OPTIONS");
    return send(response, 204, {});
  }
  if (request.method !== "DELETE") {
    response.setHeader("Allow", "DELETE, OPTIONS");
    return send(response, 405, { error: "Method not allowed" });
  }
  const db = config();
  if (!db) return send(response, 503, { error: "Account deletion is unavailable while storage is offline." });
  const account = await accountFromToken(db.url, db.key, bearer(request));
  if (!account) return send(response, 401, { error: "Sign in to delete your account." });

  let orphaned = 0;
  try {
    for (const slug of await affectedGroups(db, account)) {
      const result = await updateRow(db.url, db.key, slug, (state) => {
        const cleaned = removeAccountFromWorkspace(state, account);
        return { state: cleaned.changed ? cleaned.state : null, reply: () => ({ removed: cleaned.changed, orphaned: cleaned.orphaned }) };
      });
      if (![200, 404].includes(result.status)) {
        return send(response, 502, { error: "Could not finish clearing your group data. Your account is still active; please try again." });
      }
      if (result.body?.orphaned) orphaned += 1;
    }
    // Recheck before deleting Auth: a group may have changed while the first
    // pass ran. A retry remains safe if the user belongs to many groups.
    if ((await affectedGroups(db, account)).length) {
      return send(response, 409, { error: "A group changed during deletion. Your account is still active; please try again." });
    }
    await dropUnclaimedInvites(db, account);
    const deleted = await fetch(`${db.url}/auth/v1/admin/users/${encodeURIComponent(account.id)}`, {
      method: "DELETE", headers: restHeaders(db.key),
    });
    if (!deleted.ok) throw new Error("auth-delete");
    return send(response, 200, { deleted: true, groupsWithoutManager: orphaned });
  } catch (error) {
    console.error("account deletion failed:", error?.message || "Error");
    return send(response, 502, { error: "Could not finish deleting your account. Please try again." });
  }
}

export default async function handler(request, response) {
  try {
    return await handle(request, response);
  } catch (error) {
    console.error("account endpoint failed:", error?.name || "Error");
    if (response.headersSent) return undefined;
    return send(response, 502, { error: "Could not reach account storage." });
  }
}
