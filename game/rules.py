"""Game constants and shop catalog for Bob's Pocket Dungeon."""

from dataclasses import dataclass

# Page / grid — 4×6 photo paper, portrait
PAGE_WIDTH_IN = 4.0
PAGE_HEIGHT_IN = 6.0
GRID_COLS = 10
GRID_ROWS = 10

# Play defaults
DEFAULT_FLOORS = 16
STARTING_HP_BASE = 6  # Starting HP = 6 + d6 (roll at start)
STARTING_COINS = 0

# Cell kinds
EMPTY = "."
WALL = "#"
ENTRANCE = "@"
EXIT = ">"
COIN = "o"
SHOP = "S"
TELEPORTER = "T"
# Monsters stored as "1".."9" (damage)


@dataclass(frozen=True)
class ShopItem:
    name: str
    cost: int
    effect: str
    marker: str = "Used"


SHOP_ITEMS: tuple[ShopItem, ...] = (
    ShopItem("Healing Potion", 3, "Restore 3 HP (once)"),
    ShopItem("Iron Shield", 5, "All monster damage −1 (min 1)", "Owned"),
    ShopItem("Lucky Feather", 3, "Reroll one die (once)"),
    ShopItem("Blackpowder Bomb", 3, "Ignore 1 monster completely"),
    ShopItem("Skeleton Key", 2, "Pass through 1 wall (once)"),
)

TITLE = "BOB'S POCKET DUNGEON"
TAGLINE = "A solo roll-and-write dungeon crawl"
CURRENCY = "GOLD"

# Compact rules for the 4×6 rules page (drawn with larger type)
RULES_SECTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "NEED",
        (
            "Pencil, booklet, and a d6.",
        ),
    ),
    (
        "SETUP",
        (
            "Roll d6. Starting HP = 6 + roll.",
            "Start with 0 GOLD at Bob.",
        ),
    ),
    (
        "EACH TURN",
        (
            "Roll d6: EVEN = straight; ODD = diagonal only.",
            "Move up to the roll; draw your path.",
            "No cutting wall corners (D&D style).",
            "No legal step? Roll again.",
        ),
    ),
    (
        "WHEN YOU CROSS",
        (
            "Monster → lose HP (chart below)",
            "Coin → +1 GOLD",
            "Chest → you may buy once",
            "Portal → exit at its pair; turn ends",
            "Stairs → go to the next floor",
        ),
    ),
    (
        "HP & DEATH",
        (
            "Carry End HP / GOLD to next Start.",
            "At 0 HP: mark a death.",
            "Reset to starting HP and 0 GOLD;",
            "skip to the next floor and continue.",
        ),
    ),
    (
        "WIN",
        (
            "Clear all floors and fill in final stats.",
        ),
    ),
)
