"""Seeded procedural dungeon floor generation."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Iterable

from .rules import (
    COIN,
    DEFAULT_FLOORS,
    EMPTY,
    ENTRANCE,
    EXIT,
    GRID_COLS,
    GRID_ROWS,
    SHOP,
    STARTING_COINS,
    TELEPORTER,
    WALL,
)


Coord = tuple[int, int]


@dataclass
class Floor:
    number: int
    grid: list[list[str]]
    entrance: Coord
    exit: Coord


@dataclass
class Book:
    seed: int
    floors: list[Floor] = field(default_factory=list)
    title: str = "Bob's Pocket Dungeon"
    gem_name: str = ""


def _neighbors(c: Coord, cols: int, rows: int, diagonal: bool = False) -> Iterable[Coord]:
    x, y = c
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diagonal:
        dirs += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for dx, dy in dirs:
        nx, ny = x + dx, y + dy
        if 0 <= nx < cols and 0 <= ny < rows:
            yield nx, ny


def _is_passable(cell: str) -> bool:
    return cell != WALL


def _flood_reachable(grid: list[list[str]], start: Coord) -> set[Coord]:
    cols, rows = len(grid[0]), len(grid)
    seen: set[Coord] = set()
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        x, y = cur
        if not _is_passable(grid[y][x]):
            continue
        seen.add(cur)
        for n in _neighbors(cur, cols, rows):
            if n not in seen:
                stack.append(n)
    return seen


def _empty_cells(grid: list[list[str]]) -> list[Coord]:
    cells: list[Coord] = []
    for y, row in enumerate(grid):
        for x, cell in enumerate(row):
            if cell == EMPTY:
                cells.append((x, y))
    return cells


def _place(grid: list[list[str]], coord: Coord, value: str) -> None:
    x, y = coord
    grid[y][x] = value


def _monster_damage(rng: random.Random, floor_number: int) -> str:
    if floor_number <= 3:
        return str(rng.randint(1, 2))
    if floor_number <= 8:
        return str(rng.randint(1, 3))
    return str(rng.randint(2, 4))


def _wall_count(floor_number: int, total_cells: int) -> int:
    # Dense corridors: ~20% early → ~32% late — multiples of 3 (L pieces)
    base = 0.2 + min(floor_number, 16) * 0.0075
    raw = int(total_cells * base)
    return max(3, (raw // 3) * 3)


# L-tromino: corner + horizontal + vertical
_WALL_L_SHAPES: tuple[tuple[Coord, ...], ...] = (
    ((0, 0), (1, 0), (0, 1)),
    ((0, 0), (-1, 0), (0, 1)),
    ((0, 0), (1, 0), (0, -1)),
    ((0, 0), (-1, 0), (0, -1)),
)


def _place_wall_ls(
    rng: random.Random,
    grid: list[list[str]],
    need: int,
    forbidden: set[Coord],
) -> None:
    cols, rows = len(grid[0]), len(grid)
    placed = 0
    guard = 0
    while placed + 3 <= need and guard < need * 40:
        guard += 1
        ox = rng.randint(0, cols - 1)
        oy = rng.randint(0, rows - 1)
        shape = _WALL_L_SHAPES[rng.randint(0, len(_WALL_L_SHAPES) - 1)]
        cells: list[Coord] = []
        ok = True
        for dx, dy in shape:
            x, y = ox + dx, oy + dy
            if not (0 <= x < cols and 0 <= y < rows):
                ok = False
                break
            if (x, y) in forbidden:
                ok = False
                break
            if grid[y][x] not in (EMPTY, WALL):
                ok = False
                break
            cells.append((x, y))
        if not ok:
            continue
        for x, y in cells:
            if grid[y][x] != WALL:
                _place(grid, (x, y), WALL)
                placed += 1


def _seal_diagonal_wall_touches(
    rng: random.Random,
    grid: list[list[str]],
    forbidden: set[Coord],
) -> None:
    """If two walls touch only at a corner, fill an ortho connector into an L."""
    cols, rows = len(grid[0]), len(grid)
    # Repeat until stable — filling one corner can create another.
    for _ in range(8):
        added = 0
        for y in range(rows):
            for x in range(cols):
                if grid[y][x] != WALL:
                    continue
                for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
                    x2, y2 = x + dx, y + dy
                    if not (0 <= x2 < cols and 0 <= y2 < rows):
                        continue
                    if grid[y2][x2] != WALL:
                        continue
                    a, b = (x + dx, y), (x, y + dy)
                    a_wall = (
                        0 <= a[0] < cols
                        and 0 <= a[1] < rows
                        and grid[a[1]][a[0]] == WALL
                    )
                    b_wall = (
                        0 <= b[0] < cols
                        and 0 <= b[1] < rows
                        and grid[b[1]][b[0]] == WALL
                    )
                    if a_wall or b_wall:
                        continue
                    options = [
                        c
                        for c in (a, b)
                        if 0 <= c[0] < cols
                        and 0 <= c[1] < rows
                        and c not in forbidden
                        and grid[c[1]][c[0]] == EMPTY
                    ]
                    if not options:
                        # Can't fill (edge / entrance) — remove the farther wall instead
                        if (x2, y2) not in forbidden:
                            grid[y2][x2] = EMPTY
                            added += 1
                        elif (x, y) not in forbidden:
                            grid[y][x] = EMPTY
                            added += 1
                        continue
                    fill = options[rng.randint(0, len(options) - 1)]
                    _place(grid, fill, WALL)
                    added += 1
        if added == 0:
            break


def _monster_count(floor_number: int) -> int:
    # Floor 1 ≈ 5, floor 16 ≈ 12
    return 4 + floor_number // 2


def _coin_count(floor_number: int) -> int:
    return 2 + floor_number // 5


def _shortest_path(grid: list[list[str]], start: Coord, goal: Coord) -> list[Coord] | None:
    cols, rows = len(grid[0]), len(grid)
    prev: dict[Coord, Coord | None] = {start: None}
    stack = [start]
    qi = 0
    while qi < len(stack):
        cur = stack[qi]
        qi += 1
        if cur == goal:
            break
        for n in _neighbors(cur, cols, rows):
            if n in prev:
                continue
            if not _is_passable(grid[n[1]][n[0]]):
                continue
            prev[n] = cur
            stack.append(n)
    if goal not in prev:
        return None
    path: list[Coord] = []
    walk: Coord | None = goal
    while walk is not None:
        path.append(walk)
        walk = prev[walk]
    path.reverse()
    return path


def generate_floor(rng: random.Random, floor_number: int) -> Floor:
    """Generate one connected floor; retry until entrance reaches exit."""
    cols, rows = GRID_COLS, GRID_ROWS
    total = cols * rows

    for _attempt in range(80):
        grid = [[EMPTY for _ in range(cols)] for _ in range(rows)]

        # Entrance left edge-ish, exit right edge-ish
        entrance = (0, rng.randint(1, rows - 2))
        exit_c = (cols - 1, rng.randint(1, rows - 2))
        _place(grid, entrance, ENTRANCE)
        _place(grid, exit_c, EXIT)

        forbidden = {entrance, exit_c}
        _place_wall_ls(rng, grid, _wall_count(floor_number, total), forbidden)
        _seal_diagonal_wall_touches(rng, grid, forbidden)

        reachable = _flood_reachable(grid, entrance)
        if exit_c not in reachable:
            continue

        # Place content only on reachable empty cells
        empties = [c for c in _empty_cells(grid) if c in reachable]

        path = _shortest_path(grid, entrance, exit_c) or []
        path_mids = [
            c for c in path[1:-1] if grid[c[1]][c[0]] == EMPTY
        ]
        near_path = [
            c
            for c in empties
            if c not in path_mids
            and any(abs(c[0] - p[0]) + abs(c[1] - p[1]) == 1 for p in path_mids)
        ]
        rng.shuffle(path_mids)
        rng.shuffle(near_path)
        rng.shuffle(empties)

        need = _monster_count(floor_number)
        on_route = path_mids + near_path
        monster_spots: list[Coord] = []
        empty_set = set(empties)
        for c in on_route:
            if len(monster_spots) >= need:
                break
            if c in empty_set:
                monster_spots.append(c)
                empty_set.discard(c)
        empties = [c for c in empties if c in empty_set]
        while len(monster_spots) < need and empties:
            monster_spots.append(empties.pop(0))

        for cell in monster_spots:
            _place(grid, cell, _monster_damage(rng, floor_number))

        def take(n: int) -> list[Coord]:
            nonlocal empties
            chosen = empties[:n]
            empties = empties[n:]
            return chosen

        for cell in take(_coin_count(floor_number)):
            _place(grid, cell, COIN)

        # Every floor has one randomly placed merchant chest
        shop_cell = take(1)[0]
        _place(grid, shop_cell, SHOP)

        # Linked portal pair on floors 4/8/12/16 — one near the chest, one far
        if floor_number % 4 == 0 and len(empties) >= 2:
            def manhattan(a: Coord, b: Coord) -> int:
                return abs(a[0] - b[0]) + abs(a[1] - b[1])

            near = [c for c in empties if manhattan(c, shop_cell) <= 2]
            if not near:
                near = sorted(empties, key=lambda c: manhattan(c, shop_cell))[:4]
            first = rng.choice(near)
            empties.remove(first)

            second = max(empties, key=lambda c: manhattan(c, first))
            empties.remove(second)
            _place(grid, first, TELEPORTER)
            _place(grid, second, TELEPORTER)

        # Re-check connectivity after placements (walls only block)
        if exit_c in _flood_reachable(grid, entrance):
            return Floor(
                number=floor_number,
                grid=grid,
                entrance=entrance,
                exit=exit_c,
            )

    # Fallback: open corridor floor
    grid = [[EMPTY for _ in range(cols)] for _ in range(rows)]
    mid = rows // 2
    entrance = (0, mid)
    exit_c = (cols - 1, mid)
    _place(grid, entrance, ENTRANCE)
    _place(grid, exit_c, EXIT)
    _place(grid, (cols // 2, 0), SHOP)
    if floor_number % 4 == 0:
        # One portal next to the chest, one across the map
        _place(grid, (cols // 2 + 1, 0), TELEPORTER)
        _place(grid, (cols - 2, rows - 1), TELEPORTER)
    for x in range(1, cols - 1):
        if x % 3 == 0:
            _place(grid, (x, mid - 1 if mid > 0 else mid), _monster_damage(rng, floor_number))
        elif x % 3 == 1:
            _place(grid, (x, mid + 1 if mid < rows - 1 else mid), COIN)
    return Floor(number=floor_number, grid=grid, entrance=entrance, exit=exit_c)


_GEM_ADJECTIVES = (
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
)
_GEM_NOUNS = (
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
)


def generate_book(seed: int, floors: int = DEFAULT_FLOORS) -> Book:
    rng = random.Random(seed)
    book = Book(
        seed=seed,
        gem_name=f"{rng.choice(_GEM_ADJECTIVES)} {rng.choice(_GEM_NOUNS)}",
    )
    for n in range(1, floors + 1):
        # Per-floor RNG stream so floor N is stable if floors count changes later
        floor_rng = random.Random(f"{seed}:{n}")
        book.floors.append(generate_floor(floor_rng, n))
    return book


def book_meta() -> dict:
    return {
        "starting_hp": "6 + d6",
        "starting_coins": STARTING_COINS,
    }
