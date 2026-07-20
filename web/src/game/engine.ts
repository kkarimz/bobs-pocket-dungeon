import type { Book, Coord } from "./dungeon";
import {
  canEnterDiagonally,
  cloneGrid,
  findPortals,
  generateBook,
  neighbors,
} from "./dungeon";
import {
  DEFAULT_FLOORS,
  EMPTY,
  EXIT,
  SHOP,
  SHOP_ITEMS,
  STARTING_COINS,
  STARTING_HP_BASE,
  TELEPORTER,
  WALL,
  monsterDamage,
} from "./rules";
import type { ShopItemId } from "./rules";

export type Screen = "title" | "setup" | "play" | "stats";

export interface Inventory {
  "healing-potion": boolean; // owned unused
  "iron-shield": boolean;
  "lucky-feather": boolean;
  "blackpowder-bomb": boolean;
  "skeleton-key": boolean;
  usedPotion: boolean;
  usedFeather: boolean;
  usedBomb: boolean;
  usedKey: boolean;
}

export interface Floater {
  id: number;
  text: string;
  kind: "dmg" | "gold" | "heal" | "info";
}

export interface RunState {
  screen: Screen;
  seed: number;
  book: Book;
  floorIndex: number; // 0-based
  grid: string[][];
  pos: Coord;
  startingHp: number;
  hp: number;
  gold: number;
  deaths: number;
  inventory: Inventory;
  // Turn
  die: number | null;
  movesLeft: number;
  diagonal: boolean;
  visitedThisTurn: string[];
  shopOpen: boolean;
  message: string;
  pendingStairs: boolean;
  /** True after HP hits 0 — wait for player to acknowledge before advancing. */
  pendingDeath: boolean;
  bombArmed: boolean;
  keyArmed: boolean;
  won: boolean;
  floaters: Floater[];
  shake: boolean;
}

export const SAVE_KEY = "bobs-pocket-dungeon-save-v1";

function keyOf(c: Coord): string {
  return `${c[0]},${c[1]}`;
}

export function emptyInventory(): Inventory {
  return {
    "healing-potion": false,
    "iron-shield": false,
    "lucky-feather": false,
    "blackpowder-bomb": false,
    "skeleton-key": false,
    usedPotion: false,
    usedFeather: false,
    usedBomb: false,
    usedKey: false,
  };
}

export function createNewRun(seed: number, floors = DEFAULT_FLOORS): RunState {
  const book = generateBook(seed, floors);
  const floor = book.floors[0]!;
  return {
    screen: "play",
    seed,
    book,
    floorIndex: 0,
    grid: cloneGrid(floor.grid),
    pos: [...floor.entrance] as Coord,
    startingHp: 0,
    hp: 0,
    gold: STARTING_COINS,
    deaths: 0,
    inventory: emptyInventory(),
    die: null,
    movesLeft: 0,
    diagonal: false,
    visitedThisTurn: [],
    shopOpen: false,
    message: "Roll starting HP.",
    pendingStairs: false,
    pendingDeath: false,
    bombArmed: false,
    keyArmed: false,
    won: false,
    floaters: [],
    shake: false,
  };
}

export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function applyStartingHp(state: RunState, roll: number): RunState {
  const hp = STARTING_HP_BASE + roll;
  return {
    ...state,
    screen: "play",
    startingHp: hp,
    hp,
    die: null,
    message: "Roll to move.",
  };
}

export function startTurnRoll(state: RunState, dieValue?: number): RunState {
  if (state.startingHp <= 0) return state;
  if (state.pendingDeath) return state;
  if (state.movesLeft > 0) return state;
  const die = dieValue ?? rollD6();
  return {
    ...state,
    die,
    movesLeft: die,
    diagonal: die % 2 === 1,
    visitedThisTurn: [keyOf(state.pos)],
    message: "Tap a cell to move.",
    pendingStairs: false,
  };
}

export function rerollWithFeather(state: RunState, dieValue?: number): RunState {
  if (
    !state.inventory["lucky-feather"] ||
    state.inventory.usedFeather ||
    state.die === null
  ) {
    return state;
  }
  const die = dieValue ?? rollD6();
  return {
    ...state,
    die,
    movesLeft: die,
    diagonal: die % 2 === 1,
    inventory: { ...state.inventory, usedFeather: true },
    visitedThisTurn: [keyOf(state.pos)],
    message: "Tap a cell to move.",
  };
}

export function legalMoves(state: RunState): Coord[] {
  return [...reachableMap(state).keys()].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return [x!, y!] as Coord;
  });
}

/** True when you still have move points but nowhere legal to step. */
export function isStuck(state: RunState): boolean {
  return (
    state.screen === "play" &&
    state.startingHp > 0 &&
    state.movesLeft > 0 &&
    !state.shopOpen &&
    !state.pendingStairs &&
    !state.pendingDeath &&
    legalMoves(state).length === 0
  );
}

/** Clear leftover moves when boxed in so the player can roll again. */
export function endTurnIfStuck(state: RunState): RunState {
  if (!isStuck(state)) return state;
  const mode = state.diagonal ? "diagonal" : "straight";
  return {
    ...state,
    movesLeft: 0,
    message: `No ${mode} steps. Roll again.`,
    floaters: [
      ...state.floaters.filter((f) => Date.now() - f.id < 1200),
      {
        id: Date.now() + Math.random(),
        text: state.diagonal ? "DIAGONAL" : "STRAIGHT",
        kind: "info" as const,
      },
    ].slice(-6),
    shake: true,
  };
}

/**
 * Normal steps follow the die mode. Gates / shop / portals can be entered
 * from any adjacent cell so you aren't softlocked beside the stairs.
 */
function stepNeighbors(
  pos: Coord,
  cols: number,
  rows: number,
  mode: "ortho" | "diag",
  grid: string[][],
): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const n of neighbors(pos, cols, rows, mode)) {
    if (mode === "diag" && !canEnterDiagonally(pos, n, grid)) continue;
    const k = keyOf(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  const other = mode === "diag" ? "ortho" : "diag";
  for (const n of neighbors(pos, cols, rows, other)) {
    if (other === "diag" && !canEnterDiagonally(pos, n, grid)) continue;
    const cell = grid[n[1]]![n[0]]!;
    if (cell !== EXIT && cell !== SHOP && cell !== TELEPORTER) continue;
    const k = keyOf(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

/** One-step neighbors only (used while auto-walking a path). */
export function adjacentMoves(state: RunState): Coord[] {
  if (
    state.movesLeft <= 0 ||
    state.shopOpen ||
    state.pendingStairs ||
    state.pendingDeath
  )
    return [];
  const cols = state.grid[0]!.length;
  const rows = state.grid.length;
  const visited = new Set(state.visitedThisTurn);
  const out: Coord[] = [];
  const mode = state.diagonal ? "diag" : "ortho";
  for (const n of stepNeighbors(state.pos, cols, rows, mode, state.grid)) {
    const [x, y] = n;
    const cell = state.grid[y]![x]!;
    const k = keyOf(n);
    if (visited.has(k)) continue;
    if (cell === WALL) {
      if (
        state.keyArmed &&
        state.inventory["skeleton-key"] &&
        !state.inventory.usedKey
      ) {
        out.push(n);
      }
      continue;
    }
    out.push(n);
  }
  return out;
}

/** All cells reachable this turn within remaining moves (shortest path per cell). */
export function reachableMap(state: RunState): Map<string, Coord[]> {
  const result = new Map<string, Coord[]>();
  if (
    state.movesLeft <= 0 ||
    state.shopOpen ||
    state.pendingStairs ||
    state.pendingDeath
  )
    return result;

  const cols = state.grid[0]!.length;
  const rows = state.grid.length;
  const mode = state.diagonal ? "diag" : "ortho";

  type Node = {
    pos: Coord;
    left: number;
    path: Coord[];
    visited: Set<string>;
  };

  const queue: Node[] = [
    {
      pos: state.pos,
      left: state.movesLeft,
      path: [],
      visited: new Set(state.visitedThisTurn),
    },
  ];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.left <= 0) continue;

    for (const n of stepNeighbors(cur.pos, cols, rows, mode, state.grid)) {
      const k = keyOf(n);
      if (cur.visited.has(k)) continue;
      const cell = state.grid[n[1]]![n[0]]!;
      const canWall =
        cell === WALL &&
        state.keyArmed &&
        state.inventory["skeleton-key"] &&
        !state.inventory.usedKey;
      if (cell === WALL && !canWall) continue;

      const nextPath = [...cur.path, n];
      if (!result.has(k)) result.set(k, nextPath);

      // Portals always end the path (stepping on one warps you).
      // Chests / stairs can be walked through; interact only if you stop there.
      if (cell === TELEPORTER) continue;

      const nextVisited = new Set(cur.visited);
      nextVisited.add(k);
      queue.push({
        pos: n,
        left: cur.left - 1,
        path: nextPath,
        visited: nextVisited,
      });
    }
  }

  return result;
}

export function pathTo(state: RunState, dest: Coord): Coord[] | null {
  return reachableMap(state).get(keyOf(dest)) ?? null;
}

function pushFloater(
  state: RunState,
  text: string,
  kind: Floater["kind"],
): Floater[] {
  return [
    ...state.floaters,
    { id: Date.now() + Math.random(), text, kind },
  ].slice(-6);
}

function applyDamage(state: RunState, raw: number): number {
  if (state.bombArmed && state.inventory["blackpowder-bomb"] && !state.inventory.usedBomb) {
    return 0;
  }
  let dmg = raw;
  if (state.inventory["iron-shield"]) dmg = Math.max(1, dmg - 1);
  return dmg;
}

function resolveCell(
  state: RunState,
  pos: Coord,
  /** True when this step is the end of the chosen path (intentional stop). */
  pathEnd = true,
): RunState {
  const [x, y] = pos;
  const cell = state.grid[y]![x]!;
  let next: RunState = {
    ...state,
    pos: [...pos] as Coord,
    shake: false,
    floaters: state.floaters.filter((f) => Date.now() - f.id < 1200),
  };
  const grid = cloneGrid(state.grid);

  if (/^[1-9]$/.test(cell)) {
    const raw = monsterDamage(cell);
    const dmg = applyDamage(next, raw);
    next.hp = Math.max(0, next.hp - dmg);
    grid[y]![x] = EMPTY;
    if (next.bombArmed) {
      next.inventory = { ...next.inventory, usedBomb: true };
      next.bombArmed = false;
      next.message =
        dmg === 0 ? "Bomb ignored the monster!" : `Hit for ${dmg} HP.`;
      next.floaters = pushFloater(
        next,
        dmg === 0 ? "BLOCKED" : `−${dmg}`,
        dmg === 0 ? "info" : "dmg",
      );
    } else {
      next.message = dmg > 0 ? `Monster −${dmg} HP.` : "No damage.";
      if (dmg > 0) {
        next.floaters = pushFloater(next, `−${dmg} HP`, "dmg");
        next.shake = true;
      }
    }
  } else if (cell === "o") {
    next.gold += 1;
    grid[y]![x] = EMPTY;
    next.message = "+1 GOLD.";
    next.floaters = pushFloater(next, "+1 GOLD", "gold");
  } else if (cell === SHOP) {
    // Object interaction: only when you stop on the chest
    if (pathEnd) {
      next.shopOpen = true;
      next.message = "Merchant.";
      next.floaters = pushFloater(next, "SHOP", "info");
    }
  } else if (cell === TELEPORTER) {
    const portals = findPortals(grid);
    const other = portals.find((p) => p[0] !== x || p[1] !== y);
    if (other) {
      next.pos = [...other] as Coord;
      next.movesLeft = 0;
      next.visitedThisTurn = [...next.visitedThisTurn, keyOf(other)];
      next.message = "Portal! Turn ends.";
      next.floaters = pushFloater(next, "WHOOSH", "info");
    }
  } else if (cell === EXIT) {
    // Using the stairs is intentional — only when your path ends here
    if (pathEnd) {
      next.pendingStairs = true;
      next.movesLeft = 0;
      next.message = "The gate awaits.";
      next.floaters = pushFloater(next, "GATE", "info");
    }
  } else if (cell === WALL && next.keyArmed) {
    grid[y]![x] = EMPTY;
    next.inventory = { ...next.inventory, usedKey: true };
    next.keyArmed = false;
    next.message = "Key opened a wall.";
    next.floaters = pushFloater(next, "CLICK", "info");
  }

  next.grid = grid;

  if (next.hp <= 0) {
    return handleDeath(next);
  }
  return next;
}

function handleDeath(state: RunState): RunState {
  const deaths = state.deaths + 1;
  return {
    ...state,
    deaths,
    hp: 0,
    movesLeft: 0,
    shopOpen: false,
    pendingStairs: false,
    pendingDeath: true,
    bombArmed: false,
    keyArmed: false,
    floaters: [{ id: Date.now(), text: "DEAD", kind: "dmg" }],
    shake: true,
    message: `Death #${deaths}.`,
  };
}

/** After the death screen — next floor (reset HP/gold) or run-over stats. */
export function acknowledgeDeath(state: RunState): RunState {
  if (!state.pendingDeath) return state;
  const nextFloor = state.floorIndex + 1;
  if (nextFloor >= state.book.floors.length) {
    return {
      ...state,
      gold: 0,
      screen: "stats",
      won: false,
      pendingDeath: false,
      message: "You fell on the final stretch.",
      floaters: [],
      shake: false,
    };
  }
  const floor = state.book.floors[nextFloor]!;
  return {
    ...state,
    floorIndex: nextFloor,
    grid: cloneGrid(floor.grid),
    pos: [...floor.entrance] as Coord,
    hp: state.startingHp,
    gold: 0,
    die: null,
    movesLeft: 0,
    visitedThisTurn: [],
    shopOpen: false,
    pendingStairs: false,
    pendingDeath: false,
    bombArmed: false,
    keyArmed: false,
    floaters: [],
    shake: false,
    message: "Roll to move.",
  };
}

export function stepTo(
  state: RunState,
  dest: Coord,
  opts?: { pathEnd?: boolean },
): RunState {
  const legal = adjacentMoves(state);
  if (!legal.some((c) => c[0] === dest[0] && c[1] === dest[1])) return state;

  let next: RunState = {
    ...state,
    movesLeft: state.movesLeft - 1,
    visitedThisTurn: [...state.visitedThisTurn, keyOf(dest)],
    // Keep recent floaters so mid-path hits (monster/gold) stay visible
    // while Bob keeps walking; resolveCell prunes stale ones.
    shake: false,
  };
  next = resolveCell(next, dest, opts?.pathEnd ?? true);
  if (next.screen !== "play") return next;
  if (next.movesLeft === 0 && !next.pendingStairs && !next.shopOpen) {
    // Keep short event text; otherwise prompt next roll
    const keepEvent =
      /^(Monster|Hit|\+1 GOLD|Bomb|Key|No damage|BLOCKED|Portal)/i.test(
        next.message,
      ) || next.message.includes("−");
    next = {
      ...next,
      message: keepEvent ? next.message : "Roll again.",
    };
  }
  return next;
}

export function clearFloaters(state: RunState): RunState {
  return { ...state, floaters: [], shake: false };
}

export function clearPendingStairs(state: RunState): RunState {
  if (!state.pendingStairs) return state;
  return {
    ...state,
    pendingStairs: false,
    message: "Roll to move.",
  };
}

export function openStairsGate(state: RunState): RunState {
  const [x, y] = state.pos;
  if (state.grid[y]![x] !== EXIT) return state;
  return {
    ...state,
    pendingStairs: true,
    movesLeft: 0,
    message: "The gate awaits.",
  };
}

export function descendStairs(state: RunState): RunState {
  if (!state.pendingStairs) return state;
  const nextFloor = state.floorIndex + 1;
  if (nextFloor >= state.book.floors.length) {
    return {
      ...state,
      screen: "stats",
      won: true,
      pendingStairs: false,
      movesLeft: 0,
      message: "Dungeon cleared!",
    };
  }
  const floor = state.book.floors[nextFloor]!;
  return {
    ...state,
    floorIndex: nextFloor,
    grid: cloneGrid(floor.grid),
    pos: [...floor.entrance] as Coord,
    die: null,
    movesLeft: 0,
    visitedThisTurn: [],
    shopOpen: false,
    pendingStairs: false,
    bombArmed: false,
    keyArmed: false,
    floaters: [{ id: Date.now(), text: `FLOOR ${nextFloor + 1}`, kind: "info" }],
    shake: false,
    message: `Floor ${nextFloor + 1}. Roll to move.`,
  };
}

export function buyItem(state: RunState, id: ShopItemId): RunState {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return state;
  if (state.inventory[id]) return state;
  if (state.gold < item.cost) {
    return { ...state, message: "Not enough gold." };
  }
  return {
    ...state,
    gold: state.gold - item.cost,
    inventory: { ...state.inventory, [id]: true },
    message: `Bought ${item.name}.`,
  };
}

export function closeShop(state: RunState): RunState {
  return { ...state, shopOpen: false };
}

export function usePotion(state: RunState): RunState {
  if (!state.inventory["healing-potion"] || state.inventory.usedPotion) {
    return state;
  }
  return {
    ...state,
    hp: state.hp + 3,
    inventory: { ...state.inventory, usedPotion: true },
    message: "Potion: +3 HP.",
  };
}

export function armBomb(state: RunState): RunState {
  if (!state.inventory["blackpowder-bomb"] || state.inventory.usedBomb) {
    return state;
  }
  return {
    ...state,
    bombArmed: !state.bombArmed,
    message: state.bombArmed ? "Bomb cancelled." : "Bomb armed.",
  };
}

export function armKey(state: RunState): RunState {
  if (!state.inventory["skeleton-key"] || state.inventory.usedKey) {
    return state;
  }
  return {
    ...state,
    keyArmed: !state.keyArmed,
    message: state.keyArmed ? "Key cancelled." : "Key armed.",
  };
}

export function saveRun(state: RunState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as RunState;
    if (typeof state.pendingDeath !== "boolean") {
      state.pendingDeath = false;
    }
    // Scrub legacy stacked status lines from older builds
    if (
      /Rolled \d+|tap a cell to dash|·\s*Roll again|No moves from here/i.test(
        state.message ?? "",
      )
    ) {
      state.message =
        state.movesLeft > 0 ? "Tap a cell to move." : "Roll to move.";
    }
    return state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return !!localStorage.getItem(SAVE_KEY);
}
