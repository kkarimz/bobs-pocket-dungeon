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
export const TELEPORTER = "T";

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
  "2": "imp",
  "3": "orc",
  "4": "dragon",
};

export const CELL_ICONS: Record<string, string> = {
  "@": "bob",
  ">": "exit",
  "#": "wall",
  o: "coin",
  S: "shop",
  T: "teleport",
};

export function iconForCell(val: string): string | null {
  if (val in CELL_ICONS) return CELL_ICONS[val]!;
  if (val in MONSTER_ICONS) return MONSTER_ICONS[val]!;
  return null;
}

export function monsterDamage(val: string): number {
  if (!/^[1-9]$/.test(val)) return 0;
  return Number(val);
}
