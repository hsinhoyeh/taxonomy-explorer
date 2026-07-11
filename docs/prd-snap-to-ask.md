# PRD: Snap-to-Ask (拍課本，問孩子)

**Status:** Draft v1 · 2026-07-12
**Feature owner:** hsinhoyeh
**Tracking:** (issue TBD)

## One-liner

A parent photographs the textbook page their child learned at school today;
the app identifies the matching micro-topic(s) in the taxonomy and hands the
parent tonight's ready-to-say conversation question, evidence checklist, and
prerequisite context — turning "上課學了什麼？" into a concrete, guided
5-minute conversation.

## Background & problem

The app today is browse-first: a parent must know what to look for among
1,590 topics. Two hard problems follow:

1. **Cold start** — we don't know where a child is on the learning map, and
   asking a parent to run a placement quiz is high-friction.
2. **No daily trigger** — nothing connects the app to what actually happened
   in the child's day, so there is no natural moment to open it.

A textbook photo solves both with one gesture. What the school teaches today
*is* the child's frontier (the school has, by construction, covered its
prerequisites), and "what did you learn today?" is a question parents already
ask — we make it land.

## Validating example (real data)

Input: a photo of a 康軒-style 社會領域 page, 「第9回 貨幣的演進」— barter
(以物易物, 空心菜換雞蛋), why barter fails (價值高低不易換算、對方不一定想要),
commodity money (貝殼、金子、銀子). Fully zhuyin-annotated → early elementary.

Expected match against the taxonomy (verified by keyword search over
`data/topics.json`):

| Rank | Topic | Why |
|---|---|---|
| 1 | `mt_SsS7GptD_o` **What Money Is** (Life Skills · Money & Finance, 5–7) | Description literally covers "brief history from barter to coins"; evidence includes *"Give an example of how buying worked before money existed (swapping or bartering)"* |
| 2 | `mt_SbEaQnMQoD` **Buyers & Sellers** (Life Skills · Entrepreneurship, 5–7) | Exchange/transaction concept |
| 3 | `mt_RNRymbz5SO` **Buying Things** (Life Skills · Money & Finance, 5–7) | Transaction mechanics |

The rank-1 topic's `assessmentPrompt` — *"If you asked {{name}} why people use
money instead of just swapping things, could they give you a sensible
answer?"* — is precisely the comprehension question for this page. This is the
quality bar: the top match should feel inevitable, not approximate.

## Goals & success metrics

North-star (product-wide): **evidence items checked per family per week**.

Feature metrics:
- **Match acceptance rate** ≥ 70%: user taps one of the top-3 suggested topics
  (vs. "none of these").
- **Snap → conversation conversion** ≥ 40%: a snap session ends with ≥1
  evidence item checked within 24h.
- **Repeat usage**: ≥2 snaps/week per active family after week 2.
- Latency: photo → candidates on screen < 8s p90.

## Non-goals (v1)

- No answer *grading* (the AI conversation coach is a separate, later feature).
- No storing of photos — process and discard (see Privacy).
- No 108課綱 standards alignment (taxonomy carries NGSS/Common Core/UK NC
  only; semantic matching is the mechanism, standards mapping is future work).
- No OCR-perfect transcript of the page; we extract *concepts*, not text.
- No offline mode.

## Users & scenario

Primary: the existing persona — a Taiwanese parent of an elementary-age child,
at home after school, textbook in the backpack. Secondary: educators/tutors
using multi-profile rosters (feature works identically; the profile switcher
already exists).

Core scenario: dinner-table. Parent snaps the page → picks the suggested topic
→ reads the (zh-TW, zhuyin-annotated) question aloud → checks off evidence as
the child demonstrates understanding → sees "unlocks next" for tomorrow.

## User flow

1. **Entry**: camera/upload button in the header (and on the home page as the
   primary CTA). Works with camera capture on mobile and file upload on desktop.
2. **Processing**: photo → vision LLM → concept extraction → top-3 topic
   candidates with confidence, each shown as an existing `TopicCard` (name,
   age band, description, bilingual).
3. **Confirm**: parent taps the right one ("none of these" falls back to
   subject browse pre-filtered by the detected subject).
4. **Converse**: lands on the existing topic page (evidence checklist +
   "try asking" prompt + prerequisite graph). No new page type needed.
5. **Follow-up**: on all-done celebration, "unlocks next" surfaces as the CTA
   for the next session (existing data, small UI addition).

Degraded paths:
- Blurry/unreadable photo → "try again, closer and flatter" with example.
- Page maps to no topic (e.g. school-admin page, art class) → honest empty
  state + subject browse.
- Multi-concept page → up to 3 candidates is the norm, not the exception.

## Functional requirements

- **FR-1** Accept JPEG/PNG/HEIC up to 10MB from camera or file picker.
- **FR-2** Extract: subject guess, concept summary (one sentence, zh-TW + EN),
  estimated grade band (zhuyin presence is a strong early-elementary signal).
- **FR-3** Return top-3 taxonomy topic candidates with confidence scores;
  below-threshold results render the empty state, never a forced bad match.
- **FR-4** Candidate selection routes to the existing `/topic/[id]` page.
- **FR-5** The active child profile's age influences ranking (a 6-year-old's
  page should prefer 5–7 band topics over 9–11 ones).
- **FR-6** All UI strings bilingual EN/zh-TW consistent with the existing
  i18n layer.
- **FR-7** Rate limit per client (e.g. 20 snaps/day) to bound API cost.

## Technical design

```
[client] photo → downscale to ≤1568px, strip EXIF
   → POST /api/snap (new Next.js route handler, runs on the same container)
       → vision LLM call: image + system prompt
         "Identify the school subject and the specific concept(s) this
          textbook page teaches. Respond as JSON: {subject, concepts[],
          gradeHint}"
       → matching stage: LLM re-rank — second call with the concept summary
         + the ~50 nearest topic names/descriptions (pre-filtered by
         subject + age band from the profile) → top-3 with confidence
   ← {candidates: [{topicId, confidence, reason}], conceptSummary}
```

Decisions & rationale:
- **Server-side API route** (first backend surface in the app — everything
  until now was static). Required: the LLM key must not ship to the browser.
  The standalone Next server we already deploy supports route handlers with
  zero infra change.
- **Two-stage match (extract → re-rank)** rather than embeddings: no vector
  store to build/host for 1,590 items; a subject+age pre-filter keeps the
  re-rank prompt small. Embeddings are an optimization if latency/cost demands.
- **Model**: a small multimodal model (e.g. Haiku-class) is likely sufficient —
  the task is "read an elementary textbook page", not reasoning. Estimated
  cost: well under US$0.01/snap. Benchmark 10 real pages across 康軒/南一/翰林
  and subjects before locking the model choice.
- **Secrets**: LLM API key via container secret
  (`containarium set_secret`), read from env by the route handler.

## Privacy & data

- Photos are processed in-memory and never written to disk or logged.
  Textbook margins can contain the child's name/school — treat every image as
  PII.
- EXIF (GPS) stripped client-side before upload.
- The only thing persisted is the *chosen topicId* (client-side, existing
  localStorage progress model). Concept summaries are not stored in v1.
- Copyright: a user photographing their own textbook for private study
  guidance is fair-use-adjacent; we do not store, redistribute, or train on
  page images.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Curriculum mismatch — taxonomy is US/UK-derived; some 108課綱 content (e.g. Taiwan-specific history/geography) has no counterpart | Honest empty state; log unmatched concept summaries (text only, aggregate) to measure the gap and prioritize taxonomy extensions |
| Match quality below the "feels inevitable" bar | Golden set of ~30 real textbook pages as a regression suite before launch; top-3 + user confirmation (never auto-select) |
| API cost runaway | FR-7 rate limit + per-day budget alarm |
| First backend = new failure mode (key expiry, provider outage) | Feature-flag the entry point; app degrades to browse-first, never breaks |
| Latency on 4G | Client-side downscale before upload; skeleton UI with progressive status |

## Milestones

1. **M0 – Feasibility spike (~1 day)**: script (not UI) sending 10 real
   textbook photos through extract→re-rank; measure top-3 hit rate by hand.
   *Gate: ≥7/10 pages have an "inevitable" top match.*
2. **M1 – MVP (~2–3 days)**: `/api/snap` route + camera/upload UI + candidate
   cards + routing to topic page. Feature-flagged. Deployed to
   taxonomy-awesome.containarium.dev.
3. **M2 – Polish**: profile-age-aware ranking, unlocks-next CTA on
   celebration, rate limiting, golden-set regression script in CI.
4. **M3 – Learn**: instrument match-acceptance + snap→conversation metrics;
   review unmatched-concept log; decide on taxonomy gap-filling vs. embeddings.

## Open questions

1. **LLM provider/key** — blocks M0. Same decision also unblocks the deferred
   illustration feature (issue #1). Recommendation: Claude Haiku-class via
   Anthropic API; one key, two features.
2. Should unmatched concept summaries be logged server-side (helps roadmap,
   slightly weakens the "nothing persisted" story)? Proposed: yes, text-only,
   no child/profile linkage.
3. Mobile camera UX: PWA-style `capture` attribute is sufficient for v1, or
   invest in a guided capture overlay (frame the page, glare warning)?
4. Should a successful snap auto-mark the topic's *prerequisites* as
   "probably known (school-covered)" to bootstrap the progress map — or is
   inferred mastery too presumptuous for v1?
