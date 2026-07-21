export const GRID_COLS = 10;
export const GRID_ROWS = 10;
export const DEFAULT_FLOORS = 16;
export const STARTING_HP_BASE = 6;
export const STARTING_COINS = 0;

export const EMPTY = ".";
export const WALL = "#";
export const ENTRANCE = "@";
export const EXIT = ">";
export const COIN = "o";
export const SHOP = "S";
export const MIMIC = "M";
export const TELEPORTER = "T";
/** Defeated monster marker (passable). */
export const DEFEATED = "x";

/** Mimic bite when you open the fake chest (shield/bomb apply). */
export const MIMIC_DAMAGE = 2;

/** How many disguised mimics to place (higher floors get nastier). */
export function mimicCountForFloor(floorNumber: number): number {
  return floorNumber >= 9 ? 2 : 1;
}

export type ShopItemId =
  | "healing-potion"
  | "iron-shield"
  | "lucky-feather"
  | "blackpowder-bomb"
  | "skeleton-key";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  cost: number;
  effect: string;
  marker: "Used" | "Owned";
  icon: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: "healing-potion",
    name: "Healing Potion",
    cost: 3,
    effect: "Restore 3 HP (once)",
    marker: "Used",
    icon: "potion",
  },
  {
    id: "iron-shield",
    name: "Iron Shield",
    cost: 5,
    effect: "All monster damage −1 (min 1)",
    marker: "Owned",
    icon: "shield",
  },
  {
    id: "lucky-feather",
    name: "Lucky Feather",
    cost: 3,
    effect: "Reroll one die (once)",
    marker: "Used",
    icon: "feather",
  },
  {
    id: "blackpowder-bomb",
    name: "Blackpowder Bomb",
    cost: 3,
    effect: "Ignore 1 monster completely",
    marker: "Used",
    icon: "bomb",
  },
  {
    id: "skeleton-key",
    name: "Skeleton Key",
    cost: 2,
    effect: "Pass through 1 wall (once)",
    marker: "Used",
    icon: "key",
  },
] as const;

export const MONSTER_ICONS: Record<string, string> = {
  "1": "slime",
  "2": "goblin",
  "3": "orc",
  "4": "dragon",
};

/** Damage dealt when you enter that monster’s cell (Iron Shield −1, min 1). */
export const MONSTER_DAMAGE: readonly {
  icon: string;
  name: string;
  damage: number;
}[] = [
  { icon: "slime", name: "Slime", damage: 1 },
  { icon: "goblin", name: "Goblin", damage: 2 },
  { icon: "orc", name: "Orc", damage: 3 },
  { icon: "dragon", name: "Dragon", damage: 4 },
];

export const CELL_ICONS: Record<string, string> = {
  "@": "bob",
  ">": "exit",
  "#": "wall",
  o: "coin",
  S: "shop",
  M: "shop", // disguised — looks like a merchant chest until opened
  T: "teleport",
};

export function iconForCell(
  val: string,
  opts?: { revealSecrets?: boolean },
): string | null {
  if (val === MIMIC && opts?.revealSecrets) return "mimic";
  if (val in CELL_ICONS) return CELL_ICONS[val]!;
  if (val in MONSTER_ICONS) return MONSTER_ICONS[val]!;
  return null;
}

export function monsterDamage(val: string): number {
  if (!/^[1-9]$/.test(val)) return 0;
  return Number(val);
}

/** Short inspect text for a grid cell (tap when not moving there). */
export function hintForCell(
  cell: string,
  opts?: {
    isPlayer?: boolean;
    hasShield?: boolean;
    revealSecrets?: boolean;
  },
): string | null {
  if (opts?.isPlayer) return "Bob — you are here.";
  if (cell === EMPTY || cell === ENTRANCE) return null;
  if (cell === DEFEATED) return "Defeated.";
  if (cell === WALL) return "Wall — blocked.";
  if (cell === COIN) return "Coin — +1 GOLD.";
  if (cell === SHOP) return "Chest — end your move here to open it.";
  if (cell === MIMIC) {
    return opts?.revealSecrets
      ? "Mimic (debug) — tap to open; bites −2 HP."
      : "Chest — end your move here to open it.";
  }
  if (cell === TELEPORTER) return "Portal — enter to warp; turn ends.";
  if (cell === EXIT) return "Stairs — tap here to descend.";
  if (/^[1-9]$/.test(cell)) {
    const raw = Number(cell);
    const mon = MONSTER_DAMAGE.find((m) => m.damage === raw);
    const name = mon?.name ?? "Monster";
    if (opts?.hasShield) {
      const effective = Math.max(1, raw - 1);
      return `${name} — −${raw} HP (shield −${effective}).`;
    }
    return `${name} — −${raw} HP.`;
  }
  return null;
}
