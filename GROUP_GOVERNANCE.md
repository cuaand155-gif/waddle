# Waddle group governance (working design)

The product should describe **admins and members**, rather than a person who owns a group. Today's `ownerId` is a technical manager field; the app has no multi-admin roles yet. The server passes that field to another signed-in member when its manager leaves or deletes their account. Self-service account deletion is available. The broader role model below is proposed.

| Role | Proposed abilities |
| --- | --- |
| Admin | Invite or remove people, turn invite links on/off, change group settings and appoint another admin. |
| Member | Share their own availability, propose plans, vote, RSVP and leave the group. |
| Guest | Use an invite pass to edit only their own availability, votes, RSVP and comments. |

More than one signed-in member may be an admin. The default creator starts as an admin. A group's admin actions should be checked by the server; the browser must not be able to grant itself the role through a full-group save. Do not add individual permission toggles until the basic roles have been tested with real groups.

When the current manager leaves or deletes their account, the first remaining signed-in member becomes manager. The group, shared plans and remaining members stay. Account deletion removes the departing person's member row, availability, votes, RSVP, comments and identifiers in hangout snapshots; other members' independent messages and shared plans may remain. If no signed-in member remains, the group stays without a manager. A person who joined the open group as a guest before it lost its manager may sign in and use that guest pass to claim management. Someone joining later cannot claim it. A locked group with no signed-in members still needs a recovery rule.

The current `ownerId` serves as the migration bridge. Introducing `adminIds` and dedicated server actions for role changes is safer than letting an ordinary workspace `PUT` change roles. Self-service deletion cleans group JSON before deleting the Supabase Auth user and returns an error if a group cannot be updated. A later role migration must preserve this ordering and safe retries.
