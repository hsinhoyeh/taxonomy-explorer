# 🧭 Taxonomy Explorer

An interactive map of what kids learn — browse subjects, see prerequisites,
and track mastery — built for families to explore together.

## Data

The content is the [Marble Skill Taxonomy (v1)](https://github.com/withmarbleapp/os-taxonomy):
1,590 micro-topics across 8 subjects, wired into a 3,221-edge prerequisite
graph, vendored as static JSON under [`data/`](data/) (`topics.json`,
`dependencies.json`, `clusters.json`, `manifest.json`).

No database, no backend — everything is loaded from JSON at build time
(see [`src/lib/taxonomy.ts`](src/lib/taxonomy.ts)) and pages are statically
generated for every subject and topic.

### License / attribution

The taxonomy is multi-licensed by its authors:

- The database (structure, IDs, relationships): **ODbL 1.0**
- Marble-authored text (topic names/descriptions/evidence/prompts): **CC BY-SA 4.0**

Per ODbL, an app built *on* the taxonomy is a "produced work" and doesn't
need to be open-sourced itself — but it must carry attribution, which is
in this app's footer:

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) ·
> https://withmarble.com · licensed under ODbL 1.0 (database) and
> CC BY-SA 4.0 (content).

If you update `data/*.json` from upstream, also refresh `PROVENANCE_UPSTREAM.md`.

## Features

- Subject → domain → topic browsing with age ranges and domain summaries
- Topic detail page: description, "needs first" / "unlocks next" prerequisite
  graph, and an evidence checklist a parent can check off with their child
- Assessment prompts personalized with the child's name (stored in
  `localStorage`, never sent anywhere)

## Develop

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # static-generates all subject/topic pages
```

## Deploy

Builds to a standalone Next.js server via Docker:

```bash
docker build -t taxonomy-explorer .
docker run -p 3000:3000 taxonomy-explorer
```
