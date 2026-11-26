# Project dashboard

React + TypeScript + Vite dashboard for the UR3e assistive bottle-opening project. It runs locally and has no backend.

```bash
cd web
npm install      # first time only (Node ≥ 20.19)
npm run dev      # http://127.0.0.1:5173
npm run build    # type-check + production build in web/dist/
```

## Data

All content comes from repository files, gathered by `scripts/sync-data.mjs` (runs before `dev` and `build`, or with `npm run sync`):

| Source | Used for |
| --- | --- |
| `progress.yaml` | Project, work packages, milestones, phases, packages, interfaces, open questions, next step |
| `experiments/**/metrics.json` | Results pages (folders starting with `_` are ignored) |
| `docs/*.md`, `README.md` | Documentation pages |
| local `git log` | Activity page |

The output, `src/generated/project.json`, is generated and not committed. The sync stops with an error if `progress.yaml` contains an empty key (usually an unquoted comma inside `{...}`).

`progress.yaml` is maintained only by the progress maintainer (see `docs/workflow.md`). The dashboard never invents results: empty sources show empty states.

## Structure

```text
scripts/sync-data.mjs     repository → src/generated/project.json
src/data.ts               loading and derived metrics (progress %, next step)
src/components/           layout, badges, progress summary, icons
src/pages/                Overview, Architecture, Roadmap, Progress, Team, Results, Docs, Activity
src/styles.css            design tokens (dark and light themes) and components
```

Later: live ROS 2 monitoring, camera view, 3D robot view, controller comparison pages. No deployment is configured.
