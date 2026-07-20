# Bob's Pocket Dungeon

A solo dungeon crawl — printable on **4×6 photo paper**, or playable in the
browser with dice, path tapping, and full run tracking.

## Play in the browser

**Live test build (GitHub Pages):**
https://kkarimz.github.io/bobs-pocket-dungeon/

```bash
cd web
npm install
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173/bobs-pocket-dungeon/).

### Build for your own domain

```bash
cd web
npm install
npm run build
```

Deploy the `web/dist/` folder to any static host (Cloudflare Pages, Netlify,
nginx, S3, GitHub Pages, etc.). No backend required.

Optional: share a layout with `?seed=42` in the URL.

## Print PDF

```bash
cd pocket-dungeon
source .venv/bin/activate

# Default: custom woodcut icons on 4×6 photo pages
python generate.py --seed 42 --floors 16 --out bob-dungeon.pdf

# Other icon styles
python generate.py --seed 42 --icon-theme classic --out bob-dungeon-classic.pdf
python generate.py --seed 42 --icon-theme ink --out bob-dungeon-ink.pdf

# Optional: two pages per US Letter with crop marks (then cut to 4×6)
python generate.py --seed 42 --floors 16 --letter-2up --out bob-dungeon-letter.pdf
```

Layout seeds match between the PDF and the web app (same dungeon generator).

## The crawl

- **Bob** — the hooded adventurer and position marker
- Monsters: slime (−1), imp (−2), orc (−3), dragon (−4)
- Merchant: potion, shield, lucky feather, bomb, and key
- Stairs, chests, gold, and portals
- Odd rolls = diagonal only; no cutting wall corners (D&D style)
- Walls are placed in L-shaped blocks for clearer corridors

## Printing on 4×6 photo paper

1. Open `bob-dungeon.pdf`
2. Print at **Actual size** / 100% (do not fit-to-page)
3. Paper size: **4×6"** portrait (4" wide × 6" tall)
4. One page per sheet; stack & binder-clip or staple

## Project layout

```
generate.py          CLI entry point (PDF)
game/                Python rules, dungeon gen, PDF render
web/                 Interactive Vite + React + TypeScript app
assets/icons-custom/ Woodcut icons (shared with web/public/icons)
```

## Icons

Default `custom` theme uses original woodcut-style icons generated for this project.
Also available for PDF: `ink` (CoMiGo CC0) and `classic` (Game-icons.net CC BY 3.0).
