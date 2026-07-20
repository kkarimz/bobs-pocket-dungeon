import type { Book, Coord, Floor } from "./dungeon";
import {
  canEnterDiagonally,
  cloneGrid,
  findPortals,
  generateBook,
  neighbors,
} from "./dungeon";
import {
  COIN,
  DEFAULT_FLOORS,
  DEFEATED,
  EMPTY,
  EXIT,
  MIMIC,
  MIMIC_DAMAGE,
  SHOP,
  STARTING_COINS,
  STARTING_HP_BASE,
  TELEPORTER,
  WALL,
  monsterDamage,
} from "./rules";

export interface RunResult {
  won: boolean;
  floorsCleared: number;
  deaths: number;
  turns: number;
  goldEnd: number;
  hpEnd: number;
  coinsTaken: number;
  fights: number;
  damageTaken: number;
}

export interface SeedStats {
  seed: number;
  runs: number;
  wins: number;
  winRate: number;
  avgDeaths: number;
  avgTurns: number;
  avgFloorsCleared: number;
  avgGoldEnd: number;
  avgCoins: number;
  avgFights: number;
  avgDamage: number;
}

function keyOf(c: Coord): string {
  return `${c[0]},${c[1]}`;
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollD6(rng: () => number): number {
  return 1 + Math.floor(rng() * 6);
}

function distToExit(grid: string[][], from: Coord, exit: Coord): number {
  const cols = grid[0]!.length;
  const rows = grid.length;
  const goal = keyOf(exit);
  const seen = new Set<string>([keyOf(from)]);
  const q: { c: Coord; d: number }[] = [{ c: from, d: 0 }];
  while (q.length) {
    const { c, d } = q.shift()!;
    if (keyOf(c) === goal) return d;
    for (const n of neighbors(c, cols, rows, "all")) {
      if (!canEnterDiagonally(c, n, grid)) continue;
      const k = keyOf(n);
      if (seen.has(k)) continue;
      const cell = grid[n[1]]![n[0]]!;
      if (cell === WALL) continue;
      seen.add(k);
      q.push({ c: n, d: d + 1 });
    }
  }
  return 999;
}

type BotState = {
  grid: string[][];
  pos: Coord;
  exit: Coord;
  hp: number;
  maxHp: number;
  gold: number;
  hasShield: boolean;
  usedPotion: boolean;
  shopUsedThisFloor: boolean;
};

function applyDmg(state: BotState, raw: number): number {
  let dmg = raw;
  if (state.hasShield) dmg = Math.max(1, dmg - 1);
  return dmg;
}

function stepNeighbors(
  pos: Coord,
  grid: string[][],
  mode: "ortho" | "diag",
): Coord[] {
  const cols = grid[0]!.length;
  const rows = grid.length;
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
    if (cell !== EXIT && cell !== SHOP && cell !== MIMIC && cell !== TELEPORTER)
      continue;
    const k = keyOf(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

/** Reachable destinations this turn → shortest path. */
function reachable(
  state: BotState,
  movesLeft: number,
  mode: "ortho" | "diag",
  visitedStart: Set<string>,
): Map<string, Coord[]> {
  const result = new Map<string, Coord[]>();
  type Node = {
    pos: Coord;
    left: number;
    path: Coord[];
    visited: Set<string>;
  };
  const queue: Node[] = [
    {
      pos: state.pos,
      left: movesLeft,
      path: [],
      visited: new Set(visitedStart),
    },
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.left <= 0) continue;
    for (const n of stepNeighbors(cur.pos, state.grid, mode)) {
      const k = keyOf(n);
      if (cur.visited.has(k)) continue;
      const cell = state.grid[n[1]]![n[0]]!;
      if (cell === WALL) continue;
      const nextPath = [...cur.path, n];
      if (!result.has(k)) result.set(k, nextPath);
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

function resolveStep(
  state: BotState,
  pos: Coord,
  interact: boolean,
): { died: boolean; tookExit: boolean; portalEnd: boolean } {
  const [x, y] = pos;
  const cell = state.grid[y]![x]!;
  state.pos = [...pos] as Coord;
  let died = false;
  let tookExit = false;
  let portalEnd = false;

  if (/^[1-9]$/.test(cell)) {
    const dmg = applyDmg(state, monsterDamage(cell));
    state.hp = Math.max(0, state.hp - dmg);
    state.grid[y]![x] = DEFEATED;
    if (state.hp <= 0) died = true;
  } else if (cell === COIN) {
    state.gold += 1;
    state.grid[y]![x] = EMPTY;
  } else if ((cell === SHOP || cell === MIMIC) && interact) {
    if (cell === MIMIC) {
      const dmg = applyDmg(state, MIMIC_DAMAGE);
      state.hp = Math.max(0, state.hp - dmg);
      state.grid[y]![x] = EMPTY;
      if (state.hp <= 0) died = true;
    } else if (!state.shopUsedThisFloor) {
      // Buy potion if hurt; shield if flush
      if (!state.usedPotion && state.gold >= 3 && state.hp <= state.maxHp - 2) {
        state.gold -= 3;
        state.hp = Math.min(state.maxHp, state.hp + 3);
        state.usedPotion = true;
        state.shopUsedThisFloor = true;
      } else if (!state.hasShield && state.gold >= 5) {
        state.gold -= 5;
        state.hasShield = true;
        state.shopUsedThisFloor = true;
      }
    }
  } else if (cell === TELEPORTER) {
    const portals = findPortals(state.grid);
    const other = portals.find((p) => p[0] !== x || p[1] !== y);
    if (other) {
      state.pos = [...other] as Coord;
      portalEnd = true;
    }
  } else if (cell === EXIT && interact) {
    tookExit = true;
  }

  return { died, tookExit, portalEnd };
}

function playFloor(
  floor: Floor,
  state: BotState,
  rng: () => number,
  maxTurns: number,
): {
  cleared: boolean;
  died: boolean;
  turns: number;
  coins: number;
  fights: number;
  damage: number;
} {
  state.grid = cloneGrid(floor.grid);
  state.pos = [...floor.entrance] as Coord;
  state.exit = [...floor.exit] as Coord;
  state.shopUsedThisFloor = false;

  let turns = 0;
  let coins = 0;
  let fights = 0;
  let damage = 0;

  while (turns < maxTurns) {
    turns++;
    const die = rollD6(rng);
    const movesLeft0 = die;
    const mode: "ortho" | "diag" = die % 2 === 1 ? "diag" : "ortho";
    let movesLeft = movesLeft0;
    const visited = new Set<string>([keyOf(state.pos)]);

    const reach = reachable(state, movesLeft, mode, visited);
    if (reach.size === 0) continue;

    // Prefer exit if reachable
    const exitKey = keyOf(state.exit);
    let targetPath = reach.get(exitKey) ?? null;

    // Else shop if low HP and can afford potion
    if (
      !targetPath &&
      !state.shopUsedThisFloor &&
      state.gold >= 3 &&
      state.hp <= state.maxHp - 2
    ) {
      let best: Coord[] | null = null;
      let bestLen = 999;
      for (const [k, path] of reach) {
        const [x, y] = k.split(",").map(Number);
        const cell = state.grid[y!]![x!]!;
        if (cell !== SHOP && cell !== MIMIC) continue;
        if (path.length < bestLen) {
          bestLen = path.length;
          best = path;
        }
      }
      targetPath = best;
    }

    // Else cell that minimizes remaining distance to exit (prefer safer paths)
    if (!targetPath) {
      let best: Coord[] | null = null;
      let bestScore = Infinity;
      for (const [, path] of reach) {
        const dest = path[path.length - 1]!;
        const cell = state.grid[dest[1]]![dest[0]]!;
        let pathDmg = 0;
        for (const p of path) {
          const c = state.grid[p[1]]![p[0]]!;
          if (/^[1-9]$/.test(c)) pathDmg += applyDmg(state, monsterDamage(c));
        }
        // Don't pick a suicide path if another option exists
        if (pathDmg >= state.hp && reach.size > 1) continue;
        const d = distToExit(state.grid, dest, state.exit);
        const score =
          d * 100 + pathDmg * 8 + path.length + (cell === TELEPORTER ? 40 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = path;
        }
      }
      // Fallback if every path was filtered as lethal
      if (!best) {
        for (const [, path] of reach) {
          const dest = path[path.length - 1]!;
          const d = distToExit(state.grid, dest, state.exit);
          if (d < bestScore) {
            bestScore = d;
            best = path;
          }
        }
      }
      targetPath = best;
    }

    if (!targetPath || !targetPath.length) continue;

    for (let i = 0; i < targetPath.length; i++) {
      const step = targetPath[i]!;
      const isLast = i === targetPath.length - 1;
      movesLeft--;
      visited.add(keyOf(step));
      const hp0 = state.hp;
      const gold0 = state.gold;
      const cellBefore = state.grid[step[1]]![step[0]]!;
      // Interact on the tapped destination (matches App walkTo)
      const res = resolveStep(state, step, isLast);
      if (/^[1-9]$/.test(cellBefore)) {
        fights++;
        damage += Math.max(0, hp0 - state.hp);
      }
      if (state.gold > gold0) coins += state.gold - gold0;
      if (res.died) {
        return { cleared: false, died: true, turns, coins, fights, damage };
      }
      if (res.tookExit) {
        return { cleared: true, died: false, turns, coins, fights, damage };
      }
      if (res.portalEnd) break;
    }
  }

  return { cleared: false, died: false, turns, coins, fights, damage };
}

/** One full book run (all floors). Death advances floor with HP refill / gold wipe. */
export function simulateRun(
  book: Book,
  rng: () => number,
  maxTurnsPerFloor = 120,
): RunResult {
  const maxHp = STARTING_HP_BASE + rollD6(rng);
  const state: BotState = {
    grid: [],
    pos: [0, 0],
    exit: [0, 0],
    hp: maxHp,
    maxHp,
    gold: STARTING_COINS,
    hasShield: false,
    usedPotion: false,
    shopUsedThisFloor: false,
  };

  let deaths = 0;
  let turns = 0;
  let coinsTaken = 0;
  let fights = 0;
  let damageTaken = 0;
  let floorsCleared = 0;

  for (let fi = 0; fi < book.floors.length; fi++) {
    const floor = book.floors[fi]!;
    const lastFloor = fi === book.floors.length - 1;
    const res = playFloor(floor, state, rng, maxTurnsPerFloor);
    turns += res.turns;
    coinsTaken += res.coins;
    fights += res.fights;
    damageTaken += res.damage;

    if (res.cleared) {
      floorsCleared++;
      if (lastFloor) {
        return {
          won: true,
          floorsCleared,
          deaths,
          turns,
          goldEnd: state.gold,
          hpEnd: state.hp,
          coinsTaken,
          fights,
          damageTaken,
        };
      }
      continue;
    }

    // Died or timed out — skip to next floor (or lose on the last)
    deaths++;
    if (lastFloor) {
      return {
        won: false,
        floorsCleared,
        deaths,
        turns,
        goldEnd: 0,
        hpEnd: 0,
        coinsTaken,
        fights,
        damageTaken,
      };
    }
    state.hp = maxHp;
    state.gold = 0;
  }

  return {
    won: false,
    floorsCleared,
    deaths,
    turns,
    goldEnd: state.gold,
    hpEnd: state.hp,
    coinsTaken,
    fights,
    damageTaken,
  };
}

export function simulateSeed(
  seed: number,
  runs: number,
  floors = DEFAULT_FLOORS,
): SeedStats {
  const book = generateBook(seed, floors);
  let wins = 0;
  let sumDeaths = 0;
  let sumTurns = 0;
  let sumFloors = 0;
  let sumGold = 0;
  let sumCoins = 0;
  let sumFights = 0;
  let sumDamage = 0;

  for (let i = 0; i < runs; i++) {
    const rng = mulberry32((seed * 10007 + i * 9973) >>> 0);
    const res = simulateRun(book, rng);
    if (res.won) wins++;
    sumDeaths += res.deaths;
    sumTurns += res.turns;
    sumFloors += res.floorsCleared;
    sumGold += res.goldEnd;
    sumCoins += res.coinsTaken;
    sumFights += res.fights;
    sumDamage += res.damageTaken;
  }

  return {
    seed,
    runs,
    wins,
    winRate: wins / runs,
    avgDeaths: sumDeaths / runs,
    avgTurns: sumTurns / runs,
    avgFloorsCleared: sumFloors / runs,
    avgGoldEnd: sumGold / runs,
    avgCoins: sumCoins / runs,
    avgFights: sumFights / runs,
    avgDamage: sumDamage / runs,
  };
}

export function summarize(all: SeedStats[]) {
  const n = all.length;
  const avg = (fn: (m: SeedStats) => number) =>
    all.reduce((s, m) => s + fn(m), 0) / n;
  return {
    seeds: n,
    winRate: avg((m) => m.winRate),
    avgDeaths: avg((m) => m.avgDeaths),
    avgTurns: avg((m) => m.avgTurns),
    avgFloorsCleared: avg((m) => m.avgFloorsCleared),
    avgFights: avg((m) => m.avgFights),
    avgDamage: avg((m) => m.avgDamage),
    avgCoins: avg((m) => m.avgCoins),
    avgGoldEnd: avg((m) => m.avgGoldEnd),
  };
}
