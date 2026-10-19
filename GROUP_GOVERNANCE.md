# Waddle group governance (working design)

The product should describe **admins and members**, rather than a person who owns a group. Today's `ownerId` is a technical manager field; the app has no multi-admin roles or self-service account deletion yet. The server now passes that field to an existing signed-in member when its current manager leaves through a group save, and blocks departure without a successor. The broader role model below is proposed.

| Role | Proposed abilities |
| --- | --- |
| Admin | Invite or remove people, turn invite links on/off, change group settings and appoint another admin. |
| Member | Share their own availability, propose plans, vote, RSVP and leave the group. |
| Guest | Use an invite pass to edit only their own availability, votes, RSVP and comments. |

More than one signed-in member may be an admin. The default creator starts as an admin. A group's admin actions should be checked by the server; the browser must not be able to grant itself the role through a full-group save. Do not add individual permission toggles until the basic roles have been tested with real groups.

When an admin leaves or deletes their account, another admin remains in charge. If the departing person was the last admin, choose the longest-standing signed-in member as successor. Keep the group's plans and remaining members. Remove the departing person's member row, availability, votes, RSVP, comments and identifiers in hangout snapshots; disclose that other members' independent messages and shared plans may remain. If no signed-in member remains, the group must not vanish just because an account closed; the retention and future administration rule still needs a decision.

The current `ownerId` can serve as the migration bridge. Introducing `adminIds` and a dedicated server action for role changes is safer than letting an ordinary workspace `PUT` change roles. Self-service deletion must finish group cleanup before deleting the Supabase Auth user, and return an error if any group cannot be updated. Retrying must be safe.
