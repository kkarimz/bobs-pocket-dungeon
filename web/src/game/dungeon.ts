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

/**
 * D&D grid rule: diagonal steps can't cut the corner of a wall.
 * Blocked when either orthogonal flank between from→to is a wall.
 */
export function canEnterDiagonally(
  from: Coord,
  to: Coord,
  grid: string[][],
): boolean {
  const [x, y] = from;
  const [tx, ty] = to;
  const dx = tx - x;
  const dy = ty - y;
  if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return true;
  const cols = grid[0]!.length;
  const rows = grid.length;
  const ax = x + dx;
  const ay = y;
  const bx = x;
  const by = y + dy;
  if (ax < 0 || ax >= cols || ay < 0 || ay >= rows) return false;
  if (bx < 0 || bx >= cols || by < 0 || by >= rows) return false;
  if (grid[ay]![ax]! === WALL) return false;
  if (grid[by]![bx]! === WALL) return false;
  return true;
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
  // Dense corridors: ~20% early → ~32% late — round to multiples of 3 (L pieces)
  const base = 0.2 + Math.min(floorNumber, 16) * 0.0075;
  const raw = Math.trunc(totalCells * base);
  return Math.max(3, Math.floor(raw / 3) * 3);
}

/** L-tromino offsets (corner + right/left + down/up). */
const WALL_L_SHAPES: Coord[][] = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [-1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, -1],
  ],
  [
    [0, 0],
    [-1, 0],
    [0, -1],
  ],
];

function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

/** Place walls as L-shaped triplets so corners never touch only diagonally. */
function placeWallLs(
  rng: PythonRandom,
  grid: string[][],
  need: number,
  forbidden: Set<string>,
): void {
  const cols = grid[0]!.length;
  const rows = grid.length;
  let placed = 0;
  let guard = 0;
  while (placed + 3 <= need && guard < need * 40) {
    guard++;
    const ox = rng.randint(0, cols - 1);
    const oy = rng.randint(0, rows - 1);
    const shape = WALL_L_SHAPES[rng.randint(0, WALL_L_SHAPES.length - 1)]!;
    const cells: Coord[] = [];
    let ok = true;
    for (const [dx, dy] of shape) {
      const x = ox + dx;
      const y = oy + dy;
      if (!inBounds(x, y, cols, rows)) {
        ok = false;
        break;
      }
      if (forbidden.has(`${x},${y}`)) {
        ok = false;
        break;
      }
      if (grid[y]![x]! !== EMPTY && grid[y]![x]! !== WALL) {
        ok = false;
        break;
      }
      cells.push([x, y]);
    }
    if (!ok) continue;
    for (const [x, y] of cells) {
      if (grid[y]![x]! !== WALL) {
        place(grid, [x, y], WALL);
        placed++;
      }
    }
  }
}

/**
 * If two walls touch only at a corner, fill one ortho connector so they form an L/block.
 */
function sealDiagonalWallTouches(
  rng: PythonRandom,
  grid: string[][],
  forbidden: Set<string>,
): void {
  const cols = grid[0]!.length;
  const rows = grid.length;
  const diagDirs: Coord[] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let pass = 0; pass < 8; pass++) {
    let added = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y]![x]! !== WALL) continue;
        for (const [dx, dy] of diagDirs) {
          const x2 = x + dx;
          const y2 = y + dy;
          if (!inBounds(x2, y2, cols, rows)) continue;
          if (grid[y2]![x2]! !== WALL) continue;
          const a: Coord = [x + dx, y];
          const b: Coord = [x, y + dy];
          const aWall =
            inBounds(a[0], a[1], cols, rows) && grid[a[1]]![a[0]]! === WALL;
          const bWall =
            inBounds(b[0], b[1], cols, rows) && grid[b[1]]![b[0]]! === WALL;
          if (aWall || bWall) continue;
          const options: Coord[] = [];
          for (const c of [a, b]) {
            if (
              inBounds(c[0], c[1], cols, rows) &&
              !forbidden.has(`${c[0]},${c[1]}`) &&
              grid[c[1]]![c[0]]! === EMPTY
            ) {
              options.push(c);
            }
          }
          if (!options.length) {
            const k2 = `${x2},${y2}`;
            const k1 = `${x},${y}`;
            if (!forbidden.has(k2)) {
              grid[y2]![x2] = EMPTY;
              added++;
            } else if (!forbidden.has(k1)) {
              grid[y]![x] = EMPTY;
              added++;
            }
            continue;
          }
          const fill = options[rng.randint(0, options.length - 1)]!;
          place(grid, fill, WALL);
          added++;
        }
      }
    }
    if (added === 0) break;
  }
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

    const forbidden = new Set([
      `${entrance[0]},${entrance[1]}`,
      `${exitC[0]},${exitC[1]}`,
    ]);
    placeWallLs(rng, grid, wallCount(floorNumber, total), forbidden);
    sealDiagonalWallTouches(rng, grid, forbidden);

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
