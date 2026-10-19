import test from "node:test";
import assert from "node:assert/strict";
import { completedTogether, mergeMemberRsvp, recordHangouts } from "../lib/hangout-history.js";

const members = [
  { id: "a", userId: "user-a" },
  { id: "b", userId: "user-b" },
  { id: "c", userId: "user-c" },
];
const plan = { id: "plan-1", chosen: "2026-10-18T18:00:00Z", chosenEnd: "2026-10-18T20:00:00Z", rsvp: { at: "2026-10-18T18:00:00Z", answers: { a: "yes", b: "yes", c: "no" } } };

test("a completed RSVP remains in a friend's history after the group starts another plan", () => {
  const history = recordHangouts([], null, plan, members, new Date("2026-10-18T19:00:00Z"));
  assert.equal(completedTogether(history, "user-a", "user-b", new Date("2026-10-18T19:00:00Z")).length, 0);
  assert.equal(completedTogether(history, "user-a", "user-b", new Date("2026-10-18T20:00:00Z")).length, 1);
  assert.equal(completedTogether(history, "user-a", "user-c", new Date("2026-10-19T00:00:00Z")).length, 0);
  const afterNewPlan = recordHangouts(history, plan, null, members, new Date("2026-10-19T00:00:00Z"));
  assert.equal(completedTogether(afterNewPlan, "user-a", "user-b", new Date("2026-10-19T00:00:00Z")).length, 1);
});

test("moving a future plan removes its old date", () => {
  const history = recordHangouts([], null, plan, members, new Date("2026-10-17T00:00:00Z"));
  assert.equal(recordHangouts(history, plan, null, members, new Date("2026-10-17T00:00:00Z")).length, 0);
});

test("one member cannot forge another member's RSVP", () => {
  const submitted = { ...plan, rsvp: { ...plan.rsvp, answers: { a: "yes", b: "no", c: "yes" } } };
  assert.deepEqual(mergeMemberRsvp(plan, submitted, "a"), plan.rsvp);
  assert.deepEqual(mergeMemberRsvp(plan, submitted, "b").answers, { a: "yes", b: "no", c: "no" });
});
