# QuickQReate teams: shared codes, clear roles, clean leaving

This is Phase 3 of the redesign (see `2026-10-14-quickqreate-redesign-design.md`, §8). It replaces the team model built in the power-tools migration. The decisions were made with David on 2026-10-14.

## 1. Why

**The problem David found.** He invited someone, they accepted, and they couldn't find his codes.

**Today's model** is one-way:
- Every account is a workspace.
- An invite lets a member into the owner's workspace, and the member has to find the switcher to get there.
- The owner never sees the member's codes.
- There's no record of who made a code.

**What David wants:**
- People who are invited work together, and see each other's codes both ways.
- Roles decide what you can do to other people's codes.
- Leaving a team ends the sharing in both directions.
- Someone on their own sees none of this.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| Ownership | Everyone owns the codes, folders and hosted pages they make, with their scans and feedback. |
| Sharing | Teammates see each other's codes both ways, except codes marked Private. |
| Roles | Owner (the person who invites), Editor, Viewer. See §3. |
| Teams per person | One. You either own a team (you've invited people) or belong to one, never both, never two. |
| Leaving | Sharing ends both ways at once, and the person keeps their codes. |
| Removing | The owner chooses: **keep their codes** (they move to the owner's account) or **let them take their codes**. |
| Viewing teammates | Person by person, with a clear switch row and an **Everyone** view. |
| Private codes | A per-code switch, shown only to people in a team. |
| Solo accounts | No team UI at all: no switch row, no Private switch, no "Created by", no role labels. |

Industry check (2026-10-14): Uniqode has Owner, Admin, Editor and Viewer roles, where Editors and Viewers manage only their own resources, plus ownership transfer. QR Tiger has Admin, Editor and Viewer, with read-only Viewers. QR Code Generator PRO and Bitly keep codes with the account. Canva offers "Transfer designs and remove" or "Remove only". Keep-or-take on removal follows Canva and Uniqode, and protects printed codes.

## 3. How teams work

| A person can… | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| See teammates' codes, analytics and feedback (not Private ones) | ✓ | ✓ | ✓ |
| Create codes (always in their own space) | ✓ | ✓ | ✓ |
| Change, pause, move, file and delete their own codes and folders | ✓ | ✓ | ✓ |
| Change, pause, move, file and delete teammates' codes and folders | ✓ | ✓ | – |
| Invite people, change roles, remove people | ✓ | – | – |
| Leave the team | – (removes members instead) | ✓ | ✓ |

- **Creating** always puts the code in your own space. "Create in someone else's space" no longer exists. The Create page and bulk create drop their `?workspace=` handling.
- **Moving a teammate's code to a folder** offers that teammate's folders, because a code and its folder always share an owner.
- **Private codes** are visible only to the person who made them, the owner included. They never appear in teammates' lists, counts, scan summaries or the Everyone view.
- **API keys** are unchanged: a key acts on its owner's own codes.

## 4. Leaving and removing

- **A member leaves** from the Team page.
  - The confirmation reads: "You'll keep your codes. You and David's team will stop seeing each other's codes."
  - Access ends both ways the moment they confirm.
- **The owner removes someone.** A dialog offers two choices:
  - **Keep their codes:**
    - The member's shared codes and folders move into the owner's account.
    - Printed codes keep working exactly as before, with the same short links, scans, feedback and hosted-page media.
    - Folder names that clash with the owner's get the member's name added ("Menus (Alex)").
    - The member's Private codes always stay with them.
  - **Let them take their codes:** the member keeps everything, and sharing ends both ways.
- **No members left:** removing the last member makes the owner a solo account again.
- **Pending invites:** an owner's own pending invites stay theirs. Accepting one later starts a team again.

## 5. Switching between people

- **Where you start:** your own codes, as today.
- **Switch row:** on `/codes`, people in a team see a row above the list.
  - It reads You · each teammate (photo and first name) · Everyone.
  - On phones it scrolls sideways, with 44px targets.
  - The heading tells you what you can do there: "Alex's codes · You can view these" or "· You can edit these".
- **Sidebar switcher:** the existing switcher lists the same people with photos, plus Everyone.
- **Everyone** (`/codes?view=everyone`):
  - One list of your codes and every teammate's shared codes, with a "Created by" photo and name on each row and tile.
  - Each code's actions follow the role rules above.
  - The sidebar's folder list is hidden here, because folders belong to one person.
- **Accepting an invite** opens `/codes?joined=1`. Once, it shows: "You're in David's team now. Switch between people here." It points at the switch row. Nothing is stored for it.
- **Links:** `?workspace=<person id>` keeps meaning "this person's codes", so existing links and bookmarks still work. The UI calls it "<Name>'s codes".

## 6. Private codes

- **Where the switch is:** in Settings on the Create page and the code page, only when you're in a team.
  - It reads: "Private: only you can see this code."
  - Solo accounts never see it.
  - If you leave a team, it's hidden again, and the stored flag stays harmlessly.
- **What it shows:** a lock badge on the code in your own list, when you're in a team.
- **Bulk create** has no Private option. Codes it makes are shared.

## 7. Team page (`/team`)

**Owner view:**
- Invite people, as today.
- Pending invites, as today.
- Members: photo, name, role select, and Remove, which opens the keep-or-take dialog from §4.

**Member view:**
- "You're in David's team as an Editor."
- A list of teammates with their roles.
- **Leave team.**

**One-team rule messages:**
- Someone already in a team who opens an invite sees: "You're in Sam's team. Leave it before joining David's."
- An owner who has members and opens an invite sees: "You have your own team. Remove its members before joining another."
- A member who tries to invite people sees: "Only the team owner can invite people."

## 8. Data and server changes

One migration, applied like the others: through the private SQL bridge, after a verified backup.

**Tables:**
- `team_members (owner_id, member_id, role)` stays. The owner id identifies the team.
- New: `unique (member_id)`, so a person belongs to at most one team.

**Functions:**
- **`team_owner(p_user uuid)`:** the owner of the team `p_user` is in (their own id when they own members), or null for solo accounts.
- **`can_view(p_owner)`:** the caller is `p_owner`, or both are in the same team.
- **`can_edit(p_owner)`:** the caller is `p_owner`, or both are in the same team and the caller is its owner or an Editor.
- Every existing policy and function that uses `can_view` or `can_edit` inherits the new rules unchanged:
  - codes, folders, scans and feedback
  - hosted-page media storage
  - `set_code_password`, `recent_scan_counts` and `create_code`
- **`my_team()`:** returns `user_id, email, name, avatar_url, role ('owner'|'editor'|'viewer'), is_me` for everyone in the caller's team, and an empty result for solo accounts. It replaces `my_workspaces()` and `team_overview()` in the app.
- **`accept_invite`:** also enforces the one-team rules from §7.
- **Invites:** sending is blocked for anyone who's a member of another team.
- **`remove_member(p_member uuid, p_keep_codes boolean)`:**
  - security definer, two-step session required, owner only
  - with `p_keep_codes`, it moves the member's non-private codes and their folders to the owner in one transaction, renaming clashing folders, then removes the membership.
- **Moving hosted-page media:** the app copies the files into the owner's media folder and rewrites the page content, using a server action with the service role. Pages keep working if the member deletes their account later.

**Codes:**
- New column `qr_codes.is_private boolean not null default false`, which members may insert and update.
- Select, update and delete rules add "not private, or it's mine".
- The policies for scans and feedback, `recent_scan_counts` and analytics all exclude teammates' private codes.

**Existing data and two-step:**
- **Live data:** on 2026-10-14 there's one team with one member, nobody in two teams, and nobody who both owns and belongs. The migration checks this and stops with a clear error if it's ever untrue.
- **Older team codes:** codes editors created inside an owner's space before this phase stay the owner's, because who made them was never recorded.
- **Two-step accounts:** they still need a two-step session for every team read and write, as today.

## 9. Not changing

- **Codes and links:** printed codes and links (`/r/<slug>`, `/p/<slug>`) never change.
- **Invite emails:** sent through Brevo, as today.
- **Out of scope:** an Admin role, more than one team per person, and per-folder permissions. These are deferred until someone asks.

## 10. Testing

**Database (PGlite):**
- every role against every action, in both directions
- Private codes are hidden from teammates, the owner included, and from scans, feedback and counts
- leaving ends access both ways
- removing with keep moves codes and folders, including name clashes, and Private codes stay
- removing without keep moves nothing
- the one-team rules
- solo accounts are unchanged
- anon is denied, and two-step sessions are required

**Components:**
- the switch row and Everyone view
- the Private switch appears only in a team
- the Team page's leave and remove dialogs
- the one-time joined tip

**Browser (signed-in suite):**
- the owner sees a member's codes, and the member sees the owner's
- a Viewer can't edit a teammate's code, but can edit their own
- a Private code is hidden from teammates
- leaving ends access both ways
- removing with keep moves the codes
- solo accounts show no team UI
- the responsive and accessibility sweep covers the changed pages

## 11. Risks

- **Moving media on removal** touches storage. It runs as one server action, reports how many files moved, and leaves the membership in place if copying fails, so nothing is half-moved.
- **Changing `can_view`/`can_edit` changes every access rule at once.** The PGlite role-by-action matrix is the safety net, and it runs before the live migration.
- **Scope:** the plan may split this phase into two PRs. 3a: the rules, the Team page and leaving/removing. 3b: the switch row, Everyone and Private codes.
