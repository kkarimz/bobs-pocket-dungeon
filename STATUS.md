# Bob's Pocket Dungeon — session handoff

Live: https://kkarimz.github.io/bobs-pocket-dungeon/  
Repo: https://github.com/kkarimz/bobs-pocket-dungeon  
Local: `/Users/kkarim/pocket-dungeon/`

## Where we left off (2026-07-20)

### Shipped in this push
- Removed Classic / Persistent monster-rules picker (title + debug).
- Monsters always **defeat on contact**.
- Defeated tiles stay as `x` and show an **✕** on the grid (inspect: “Defeated.”).
- Print rules (`game/rules.py`) updated to match.

### Stable gameplay
- Solo roll-and-crawl: even = straight, odd = diagonal; no corner-cutting walls.
- Chests look identical; mimics disguised as shop (1 on floors 1–8, 2 from floor 9).
- Shop / stairs interact on destination (shop needs final step).
- Die UI: chevron directions; idle shows ROLL.
- Debug: `?debug=true` (free move, reveal mimics, cheats).

### Naming
- Hero is still **Bob** (Biscuit = cat, Mishmish = parrot).
- Name brainstorm parked: Erling and other D&D-flavored options considered; no rename yet.

### Deploy
- Vite `base`: `/bobs-pocket-dungeon/`
- Push to `main` → GitHub Pages via `.github/workflows/deploy-pages.yml`

## Detour
Next work is intentionally off this track — park dungeon polish here and start the detour from a clean page.
