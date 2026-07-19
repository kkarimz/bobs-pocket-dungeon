"""Load and draw fantasy icons for Bob's Pocket Dungeon."""

from __future__ import annotations

from functools import lru_cache
from io import BytesIO
from pathlib import Path

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
ICONS_DIR = ASSETS_DIR / "icons"
ICON_THEMES = {
    "classic": ASSETS_DIR / "icons",
    "ink": ASSETS_DIR / "icons-ink",
    "custom": ASSETS_DIR / "icons-custom",
}

CELL_ICONS = {
    "@": "bob",
    ">": "exit",
    "#": "wall",
    "o": "coin",
    "S": "shop",
    "T": "teleport",
}

SHOP_ICONS = {
    "Healing Potion": "potion",
    "Iron Shield": "shield",
    "Lucky Feather": "feather",
    "Blackpowder Bomb": "bomb",
    "Skeleton Key": "key",
}

# Floor-page legend as a 5×2 grid (gold sits with the monsters row)
LEGEND_ROW1 = (
    ("bob", "BOB"),
    ("exit", "STAIRS"),
    ("wall", "WALL"),
    ("shop", "MERCHANT"),
    ("teleport", "PORTAL"),
)
LEGEND_ROW2 = (
    ("coin", "+1"),
    ("slime", "−1 HP"),
    ("imp", "−2 HP"),
    ("orc", "−3 HP"),
    ("dragon", "−4 HP"),
)

# Kept for older call sites / rules page damage chart
LEGEND_ICONS = LEGEND_ROW1 + (("coin", "+1"),)

# Shown on rules page and floor legend — fixed damage by creature type
MONSTER_DAMAGE = (
    ("slime", "SLIME", 1),
    ("imp", "IMP", 2),
    ("orc", "ORC", 3),
    ("dragon", "DRAGON", 4),
)

MONSTER_ICONS = {
    "1": "slime",
    "2": "imp",
    "3": "orc",
    "4": "dragon",
}


def _to_rgba_black(path: Path) -> Image.Image:
    """Convert palette/RGBA game-icon to crisp black-on-transparent RGBA."""
    im = Image.open(path).convert("RGBA")
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 8 or (r + g + b) > 600:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                ink = 255 - max(r, g, b)
                pixels[x, y] = (0, 0, 0, max(a, ink))
    return im


@lru_cache(maxsize=64)
def get_icon(name: str) -> ImageReader:
    path = ICONS_DIR / f"{name}.png"
    if not path.exists():
        raise FileNotFoundError(f"Missing icon: {path}")
    rgba = _to_rgba_black(path)
    buf = BytesIO()
    rgba.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def set_icon_theme(theme: str) -> None:
    """Select an icon directory for subsequent PDF rendering."""
    global ICONS_DIR
    try:
        ICONS_DIR = ICON_THEMES[theme]
    except KeyError as exc:
        choices = ", ".join(sorted(ICON_THEMES))
        raise ValueError(f"Unknown icon theme {theme!r}; choose {choices}") from exc
    get_icon.cache_clear()


def draw_icon(
    c: canvas.Canvas,
    name: str,
    x: float,
    y: float,
    size: float,
    *,
    center: bool = False,
) -> None:
    icon = get_icon(name)
    if center:
        x -= size / 2
        y -= size / 2
    c.drawImage(
        icon,
        x,
        y,
        width=size,
        height=size,
        mask="auto",
        preserveAspectRatio=True,
    )


def icon_for_cell(val: str) -> str | None:
    if val in CELL_ICONS:
        return CELL_ICONS[val]
    if val.isdigit():
        return MONSTER_ICONS.get(val, "dragon")
    return None
