# Link hunt — find one good URL per entry (talks / courses / service roles) for joshspeagle.com

You get a batch file of entries (JSON). For EACH entry, try to find the single most useful public URL:
- talk: the event/program page that lists the talk (best), else the recording or slides, else the
  conference/series home page for that year; NOT a generic institution homepage.
- course: the official course page / syllabus / calendar entry for that code at U of T (artsci.calendar.utoronto.ca
  or the department course page), or the course's own site/GitHub if it has one.
- service: the committee / society / program page that names the role (e.g. an "organizing committee" page
  listing him), else the organization's page for that program.
Use WebSearch + WebFetch. VERIFY every candidate: fetch it (200), and confirm the page matches the entry
(event name + year, or course code, or organization + role) — ideally it mentions "Speagle". Do NOT guess URLs.
Output ONLY a JSON file /tmp/claude-0/-home-user-joshspeagle-github-io/40b03ea6-f1ab-50f8-9441-a14d6728c996/scratchpad/links/found-<batchname>.json :
  [{"id": "<entry id>", "url": "...", "kind": "event|program|slides|recording|course|syllabus|committee|org",
    "confidence": "high|medium|low", "evidence": "one line: what on the page matched (quote a phrase)"}]
Rules: high = page explicitly names the talk/course/role (or Speagle) and the year; medium = right event/org
and year but his name not on the page; low = plausible only. Skip entries you cannot find (do not fabricate).
Prefer https. Do not modify anything in /home/user/joshspeagle.github.io. Budget: ~2–4 searches per entry; stop
after ~60 minutes and write what you have. Return a two-line summary (counts by confidence).
