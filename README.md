# Chief of Staff

Internal V1 name: Trusted External Memory.

Anchor problem:

> You generate more value than you can reliably remember.

## Current build scope

This repo is currently building the memory foundation only:

- Capture messy context quickly.
- Preserve each capture as a raw source item.
- Show recent captures in the universal inbox.
- Keep the app usable from laptop and phone widths.

Do **not** build Chief of Staff features yet. Travel, gifts, skills, CRM, SBIR tracking, research agents, resume updates, expense tracking, relationship intelligence, calendar management, and dashboards are explicitly deferred.

## App stack

- Next.js
- TypeScript
- SQLite via `better-sqlite3`
- Simple CSS

SQLite data is stored at `data/chief-of-staff.db` by default and is ignored by git. You can override the path with `DATABASE_URL=file:/absolute/path/to.db`.

## Local setup

```bash
npm install
npm run dev
```

Then open:

- Home: `http://localhost:3000`
- Capture: `http://localhost:3000/capture`
- Inbox: `http://localhost:3000/inbox`

If port 3000 is already in use, Next.js will print the alternate local URL, such as `http://localhost:3001`.

## Production-style check

```bash
npm test
npm run lint
npm run build
npm run start
```

## First manual test

1. Open `/capture` on laptop or phone.
2. Paste a messy thought, for example:
   `Need to follow up with Sarah about pricing after the demo.`
3. Save it.
4. Confirm `/inbox` shows the raw source item with timestamp.

## Start here

- [Agent guidance](AGENTS.md)
- [Product vision](vision/product_vision.md)
- [MVP](vision/mvp.md)
- [Hermes build brief](docs/hermes_build_brief.md)
- [Operating model](docs/operating_model.md)
