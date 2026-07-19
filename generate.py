#!/usr/bin/env python3
"""Generate Bob's Pocket Dungeon booklet on 4×6 photo paper."""

from __future__ import annotations

import argparse
import secrets
from pathlib import Path

from game.dungeon import generate_book
from game.icons import ICON_THEMES, set_icon_theme
from game.render import render_letter_2up, render_pocket_pdf
from game.rules import DEFAULT_FLOORS


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate Bob's printable pocket dungeon (4×6).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="RNG seed (default: random). Reuse to reprint the same crawl.",
    )
    parser.add_argument(
        "--floors",
        type=int,
        default=DEFAULT_FLOORS,
        help=f"Number of dungeon floors (default: {DEFAULT_FLOORS}).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("bob-dungeon.pdf"),
        help="Output PDF path (default: bob-dungeon.pdf).",
    )
    parser.add_argument(
        "--letter-2up",
        "--letter-4up",
        action="store_true",
        dest="letter_2up",
        help="Layout two 4×6 pages per US Letter sheet with crop marks.",
    )
    parser.add_argument(
        "--icon-theme",
        choices=sorted(ICON_THEMES),
        default="custom",
        help="Icon style (default: custom).",
    )
    args = parser.parse_args()

    seed = args.seed if args.seed is not None else secrets.randbelow(10**9)
    if args.floors < 1:
        parser.error("--floors must be at least 1")

    book = generate_book(seed=seed, floors=args.floors)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    set_icon_theme(args.icon_theme)

    if args.letter_2up:
        render_letter_2up(book, args.out)
    else:
        render_pocket_pdf(book, args.out)

    page_count = 3 + len(book.floors) + 1
    mode = "Letter 2-up" if args.letter_2up else "4×6 photo"
    print(
        f"Wrote {args.out} "
        f"({mode}, icons={args.icon_theme}, seed={seed}, "
        f"floors={args.floors}, pages={page_count})"
    )


if __name__ == "__main__":
    main()
