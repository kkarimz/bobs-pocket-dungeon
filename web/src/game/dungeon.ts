import { PythonRandom } from "./pythonRandom";
import {
  COIN,
  DEFAULT_FLOORS,
  EMPTY,
  ENTRANCE,
  EXIT,
  GRID_COLS,
  GRID_ROWS,
  SHOP,
  TELEPORTER,
  WALL,
} from "./rules";

export type Coord = [number, number];

export interface Floor {
  number: number;
  grid: string[][];
  entrance: Coord;
  exit: Coord;
}

export interface Book {
  seed: number;
  floors: Floor[];
  title: string;
}

/** Orthogonal, diagonal-only, or both (generation flood uses ortho). */
export function neighbors(
  c: Coord,
  cols: number,
  rows: number,
  mode: "ortho" | "diag" | "all" = "ortho",
): Coord[] {
  const [x, y] = c;
  const ortho: Coord[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const diag: Coord[] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const dirs =
    mode === "ortho" ? ortho : mode === "diag" ? diag : [...ortho, ...diag];
  const out: Coord[] = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.push([nx, ny]);
  }
  return out;
}

function isPassable(cell: string): boolean {
  return cell !== WALL;
}

function floodReachable(grid: string[][], start: Coord): Set<string> {
  const cols = grid[0]!.length;
  const rows = grid.length;
  const seen = new Set<string>();
  const stack: Coord[] = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    const key = `${cur[0]},${cur[1]}`;
    if (seen.has(key)) continue;
    const [x, y] = cur;
    if (!isPassable(grid[y]![x]!)) continue;
    seen.add(key);
    for (const n of neighbors(cur, cols, rows)) {
      if (!seen.has(`${n[0]},${n[1]}`)) stack.push(n);
    }
  }
  return seen;
}

function emptyCells(grid: string[][]): Coord[] {
  const cells: Coord[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y]!.length; x++) {
      if (grid[y]![x] === EMPTY) cells.push([x, y]);
    }
  }
  return cells;
}

function place(grid: string[][], coord: Coord, value: string): void {
  grid[coord[1]]![coord[0]] = value;
}

function monsterDamage(rng: PythonRandom, floorNumber: number): string {
  if (floorNumber <= 3) return String(rng.randint(1, 2));
  if (floorNumber <= 8) return String(rng.randint(1, 3));
  return String(rng.randint(2, 4));
}

function wallCount(floorNumber: number, totalCells: number): number {
  // Dense corridors: ~20% early → ~32% late
  const base = 0.2 + Math.min(floorNumber, 16) * 0.0075;
  return Math.trunc(totalCells * base);
}

function monsterCount(floorNumber: number): number {
  // Floor 1 ≈ 5, floor 16 ≈ 12
  return 4 + Math.floor(floorNumber / 2);
}

function coinCount(floorNumber: number): number {
  return 2 + Math.floor(floorNumber / 5);
}

function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

/** Shortest walk (ortho) through non-walls. */
function shortestPath(
  grid: string[][],
  start: Coord,
  goal: Coord,
): Coord[] | null {
  const cols = grid[0]!.length;
  const rows = grid.length;
  const goalKey = `${goal[0]},${goal[1]}`;
  const prev = new Map<string, string | null>();
  const startKey = `${start[0]},${start[1]}`;
  prev.set(startKey, null);
  const queue: Coord[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const ck = `${cur[0]},${cur[1]}`;
    if (ck === goalKey) break;
    for (const n of neighbors(cur, cols, rows, "ortho")) {
      const nk = `${n[0]},${n[1]}`;
      if (prev.has(nk)) continue;
      if (!isPassable(grid[n[1]]![n[0]]!)) continue;
      prev.set(nk, ck);
      queue.push(n);
    }
  }
  if (!prev.has(goalKey)) return null;
  const path: Coord[] = [];
  let walk: string | null = goalKey;
  while (walk) {
    const [x, y] = walk.split(",").map(Number);
    path.push([x!, y!]);
    walk = prev.get(walk) ?? null;
  }
  path.reverse();
  return path;
}

export function generateFloor(rng: PythonRandom, floorNumber: number): Floor {
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const total = cols * rows;

  for (let attempt = 0; attempt < 80; attempt++) {
    const grid: string[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => EMPTY),
    );

    const entrance: Coord = [0, rng.randint(1, rows - 2)];
    const exitC: Coord = [cols - 1, rng.randint(1, rows - 2)];
    place(grid, entrance, ENTRANCE);
    place(grid, exitC, EXIT);

    const candidates: Coord[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (
          !(x === entrance[0] && y === entrance[1]) &&
          !(x === exitC[0] && y === exitC[1])
        ) {
          candidates.push([x, y]);
        }
      }
    }
    rng.shuffle(candidates);
    for (const cell of candidates.slice(0, wallCount(floorNumber, total))) {
      place(grid, cell, WALL);
    }

    const reachable = floodReachable(grid, entrance);
    if (!reachable.has(`${exitC[0]},${exitC[1]}`)) continue;

    let empties = emptyCells(grid).filter((c) =>
      reachable.has(`${c[0]},${c[1]}`),
    );

    const path = shortestPath(grid, entrance, exitC) ?? [];
    const pathMids = path
      .slice(1, -1)
      .filter((c) => grid[c[1]]![c[0]] === EMPTY);

    // Prefer monsters on / beside the entrance→exit route so you can't skirt them
    const nearPath = empties.filter((c) => {
      if (pathMids.some((p) => p[0] === c[0] && p[1] === c[1])) return false;
      return pathMids.some((p) => manhattan(p, c) === 1);
    });
    rng.shuffle(pathMids);
    rng.shuffle(nearPath);
    rng.shuffle(empties);

    const need = monsterCount(floorNumber);
    const onRoute = [...pathMids, ...nearPath];
    let placed = 0;
    const monsterSpots: Coord[] = [];
    for (const c of onRoute) {
      if (placed >= need) break;
      if (empties.some((e) => e[0] === c[0] && e[1] === c[1])) {
        monsterSpots.push(c);
        placed++;
      }
    }
    empties = empties.filter(
      (e) => !monsterSpots.some((m) => m[0] === e[0] && m[1] === e[1]),
    );
    while (placed < need && empties.length) {
      monsterSpots.push(empties.shift()!);
      placed++;
    }
    for (const cell of monsterSpots) {
      place(grid, cell, monsterDamage(rng, floorNumber));
    }

    const take = (n: number): Coord[] => {
      const chosen = empties.slice(0, n);
      empties = empties.slice(n);
      return chosen;
    };

    for (const cell of take(coinCount(floorNumber))) {
      place(grid, cell, COIN);
    }

    const shopTaken = take(1);
    if (!shopTaken.length) continue;
    const shopCell = shopTaken[0]!;
    place(grid, shopCell, SHOP);

    if (floorNumber % 4 === 0 && empties.length >= 2) {
      let near = empties.filter((c) => manhattan(c, shopCell) <= 2);
      if (!near.length) {
        near = [...empties]
          .sort((a, b) => manhattan(a, shopCell) - manhattan(b, shopCell))
          .slice(0, 4);
      }
      const first = rng.choice(near);
      empties = empties.filter((c) => !(c[0] === first[0] && c[1] === first[1]));
      let best = empties[0]!;
      let bestD = -1;
      for (const c of empties) {
        const d = manhattan(c, first);
        if (d > bestD) {
          bestD = d;
          best = c;
        }
      }
      empties = empties.filter((c) => !(c[0] === best[0] && c[1] === best[1]));
      place(grid, first, TELEPORTER);
      place(grid, best, TELEPORTER);
    }

    if (floodReachable(grid, entrance).has(`${exitC[0]},${exitC[1]}`)) {
      return {
        number: floorNumber,
        grid,
        entrance,
        exit: exitC,
      };
    }
  }

  // Fallback
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => EMPTY),
  );
  const mid = Math.floor(rows / 2);
  const entrance: Coord = [0, mid];
  const exitC: Coord = [cols - 1, mid];
  place(grid, entrance, ENTRANCE);
  place(grid, exitC, EXIT);
  place(grid, [Math.floor(cols / 2), 0], SHOP);
  if (floorNumber % 4 === 0) {
    place(grid, [Math.floor(cols / 2) + 1, 0], TELEPORTER);
    place(grid, [cols - 2, rows - 1], TELEPORTER);
  }
  for (let x = 1; x < cols - 1; x++) {
    if (x % 3 === 0) {
      place(
        grid,
        [x, mid > 0 ? mid - 1 : mid],
        monsterDamage(rng, floorNumber),
      );
    } else if (x % 3 === 1) {
      place(grid, [x, mid < rows - 1 ? mid + 1 : mid], COIN);
    }
  }
  return { number: floorNumber, grid, entrance, exit: exitC };
}

const GEM_ADJECTIVES = [
  "Ancient",
  "Whispering",
  "Royal",
  "Moonlit",
  "Emerald",
  "Forgotten",
  "Gilded",
  "Mischievous",
  "Feathered",
  "Feline",
] as const;
const GEM_NOUNS = [
  "Compass",
  "Lantern",
  "Relic",
  "Amulet",
  "Feather",
  "Bell",
  "Key",
  "Crown",
  "Goblet",
  "Gem",
] as const;

export function generateBook(
  seed: number,
  floors: number = DEFAULT_FLOORS,
): Book {
  const rng = new PythonRandom(seed);
  // Consume gem name draws to stay in sync with Python book RNG (unused in web UI)
  void `${rng.choice(GEM_ADJECTIVES)} ${rng.choice(GEM_NOUNS)}`;

  const book: Book = {
    seed,
    floors: [],
    title: "Bob's Pocket Dungeon",
  };
  for (let n = 1; n <= floors; n++) {
    const floorRng = new PythonRandom(`${seed}:${n}`);
    book.floors.push(generateFloor(floorRng, n));
  }
  return book;
}

export function cloneGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

export function findPortals(grid: string[][]): Coord[] {
  const out: Coord[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y]!.length; x++) {
      if (grid[y]![x] === TELEPORTER) out.push([x, y]);
    }
  }
  return out;
}
