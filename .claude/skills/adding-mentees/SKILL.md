---
name: adding-mentees
description: Use when adding, editing, or auditing mentee entries on the Mentorship page — the menteesByStage schema in content.json, the supervisionType/programs/awards/courses/institution badge tagging vocabulary, and the bachelors "projects array" variation that looks like missing data but isn't.
---

# Adding Mentees

Mentees live under `sections.mentorship.menteesByStage` in `content.json`. Add a **current** mentee to the relevant stage array — `postdoctoral`, `doctoral`, `mastersProjects`, `bachelors`, or `secondary` (high school); add a **former** mentee to the corresponding `menteesByStage.completed.<stage>` array. Each stage has its own color (sla/ii/ic/du/sec) used for the badge, group-heading dot, accent stripe, and breakdown-chart bar. A current entry:

```json
{
  "name": "<a href='url'>Name</a>",
  "timelinePeriod": "Season Year-Season Year",
  "supervisionType": "Primary Supervisor",
  "coSupervisors": ["<a href='url'>Name</a> (<a href='dept'>Dept</a>)"],
  "project": "Project description",
  "myCareerStage": "Assistant Professor",
  "currentStatus": "Graduate student (<a href='url'>Institution</a>)",
  "programs": ["A&A SURP"],
  "awards": ["NSERC PGS-D"],
  "courses": ["Senior Thesis"]
}
```

**Tagging** (all rendered as badges on the card and included in search):

- `supervisionType` — one of `Primary Supervisor` / `Co-Supervisor` / `Secondary Supervisor` / `Informal Supervisor` (formal = on paper; **informal** = involved but not on paper). Rendered as a role badge (formal tinted, informal muted).
- `programs` — list of research programs/opportunities (e.g. `A&A SURP`, `DSI SUDS`, `A&S ROP`, `NSERC USRA`, `Co-op Program`, `MITACS Globalink`). Cyan badge.
- `awards` — list of fellowships/scholarships/honors (e.g. `Dunlap Fellow`, `Banting Fellow`, `NSERC CGS-M`). Amber badge. (Replaces the old `fellowships`/`scholarships` fields.)
- `courses` — academic-credit context; values are exactly `Research Course`, `Junior Thesis`, or `Senior Thesis` (avoid raw course codes). Neutral badge.
- `institution` — home institution for **non-Toronto** students (e.g. visiting/external undergrads); outline badge. Omit for U of T students.

Variations: **bachelors** with several stints may use a `projects` array (`title`/`supervisionType`/`coSupervisors`) **instead of** the top-level `project`/`supervisionType` fields — such an entry is complete even though those top-level fields are absent (read the `projects` array before flagging an entry as missing data). For **former** mentees the `currentStatus`/`outcome` fields are no longer displayed (too hard to keep current), though the data may persist. Award/program/course strings may be plain text or `<a>`-linked HTML (`esc()` preserves links). Match the field names of a sibling entry exactly — misspelled keys silently fail to render.

The Mentorship page's live search is group-aware (`assets/js/redesign/mentorgroups.js`): it filters cards within `[data-mentor-group]`/`[data-mentor-section]`, collapses empty groups, and updates live counts.
