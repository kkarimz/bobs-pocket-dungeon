"""PDF rendering for Bob's Pocket Dungeon (4×6\" photo pages)."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import black, white, Color
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from .dungeon import Book, Floor
from .icons import (
    LEGEND_ROW1,
    LEGEND_ROW2,
    MONSTER_DAMAGE,
    SHOP_ICONS,
    draw_icon,
    icon_for_cell,
)
from .rules import (
    CURRENCY,
    PAGE_HEIGHT_IN,
    PAGE_WIDTH_IN,
    RULES_SECTIONS,
    SHOP_ITEMS,
    STARTING_COINS,
    STARTING_HP_BASE,
    TAGLINE,
    TITLE,
)

PAGE_W = PAGE_WIDTH_IN * inch
PAGE_H = PAGE_HEIGHT_IN * inch
MARGIN = 0.28 * inch
# Floor grids use a tighter side inset so 10×10 cells print larger
FLOOR_SIDE = 0.16 * inch


def _layout_label(seed: int) -> str:
    """Human label for the RNG seed (reprint code, not a game mechanic)."""
    return f"Layout #{seed}"


def _draw_header_boxes(c: canvas.Canvas, y_top: float, label: str) -> float:
    # Keep header clear of the page edge; title vertically centered with boxes
    y_top = min(y_top, PAGE_H - MARGIN - 0.06 * inch)
    box_w, box_h = 0.56 * inch, 0.36 * inch
    gap = 0.05 * inch
    labels = [
        ("START HP", "START GOLD"),
        ("END HP", "END GOLD"),
    ]
    x = PAGE_W - MARGIN - (box_w * 2 + gap) * 2 - 0.02 * inch
    by = y_top  # top edge of the boxes

    c.setStrokeColor(black)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 5.5)
    for pair_i, pair in enumerate(labels):
        for j, text in enumerate(pair):
            bx = x + (pair_i * 2 + j) * (box_w + gap)
            c.rect(bx, by - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(black)
            c.drawCentredString(bx + box_w / 2, by - box_h + 0.07 * inch, text)
            c.setFillColor(white)

    # Title baseline aligned to vertical center of the HP/Gold boxes
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 13)
    title_y = by - box_h / 2 - 4  # ~half of 13pt glyph height
    c.drawString(MARGIN, title_y, label.upper())
    return by - box_h - 0.14 * inch


def _draw_grid(c: canvas.Canvas, floor: Floor, x0: float, y0: float, cell: float) -> None:
    rows = len(floor.grid)
    cols = len(floor.grid[0])
    grid_w = cols * cell
    grid_h = rows * cell
    pad = cell * 0.1
    icon_size = cell - 2 * pad

    # Fill cells white (no per-cell stroke — that doubled shared edges)
    c.setFillColor(white)
    c.setStrokeColor(white)
    for y in range(rows):
        for x in range(cols):
            cx = x0 + x * cell
            cy = y0 + (rows - 1 - y) * cell
            c.rect(cx, cy, cell, cell, fill=1, stroke=0)

    # Draw each grid line exactly once at uniform weight
    c.setStrokeColor(black)
    c.setLineWidth(0.6)
    for i in range(cols + 1):
        x = x0 + i * cell
        c.line(x, y0, x, y0 + grid_h)
    for j in range(rows + 1):
        y = y0 + j * cell
        c.line(x0, y, x0 + grid_w, y)

    # Slightly heavier outer frame only
    c.setLineWidth(1.4)
    c.rect(x0, y0, grid_w, grid_h, fill=0, stroke=1)

    for y in range(rows):
        for x in range(cols):
            cx = x0 + x * cell
            cy = y0 + (rows - 1 - y) * cell
            val = floor.grid[y][x]
            name = icon_for_cell(val)
            if not name:
                continue

            if val.isdigit():
                draw_icon(c, name, cx + pad, cy + pad, icon_size)
            else:
                draw_icon(c, name, cx + pad, cy + pad, icon_size)


def _draw_legend(c: canvas.Canvas, y: float) -> None:
    """5×2 legend: terrain on top, gold + monsters below."""
    icon_s = 0.26 * inch
    row_gap = 0.52 * inch
    # Distance from icon center down to label baseline (icon radius + padding)
    label_gap = 0.26 * inch

    def draw_row(items: tuple, row_y: float, font_size: float = 6.5) -> None:
        n = len(items)
        gap = (PAGE_W - 2 * MARGIN) / n
        c.setFont("Helvetica-Bold", font_size)
        for i, (name, label) in enumerate(items):
            cx = MARGIN + gap * i + gap / 2
            draw_icon(c, name, cx, row_y, icon_s, center=True)
            c.setFillColor(black)
            c.drawCentredString(cx, row_y - label_gap, label)

    draw_row(LEGEND_ROW1, y + row_gap + 0.18 * inch)
    draw_row(LEGEND_ROW2, y + 0.18 * inch)


def draw_cover(c: canvas.Canvas, book: Book) -> None:
    c.setStrokeColor(black)
    c.setLineWidth(2.5)
    c.rect(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN, fill=0, stroke=1)
    c.setLineWidth(0.7)
    c.rect(
        MARGIN + 5,
        MARGIN + 5,
        PAGE_W - 2 * MARGIN - 10,
        PAGE_H - 2 * MARGIN - 10,
        fill=0,
        stroke=1,
    )

    draw_icon(c, "bob", PAGE_W / 2, PAGE_H - 0.95 * inch, 0.65 * inch, center=True)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.4 * inch, "BOB")

    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.85 * inch, "BOB'S")
    c.drawCentredString(PAGE_W / 2, PAGE_H - 2.2 * inch, "POCKET DUNGEON")

    c.setFont("Helvetica", 9)
    for i, line in enumerate(_wrap(TAGLINE, 38)):
        c.drawCentredString(PAGE_W / 2, PAGE_H - 2.55 * inch - i * 0.16 * inch, line)

    for name, x in (("torch", 0.9), ("orc", 2.0), ("coin", 3.1)):
        draw_icon(c, name, x * inch, 2.55 * inch, 0.4 * inch, center=True)

    c.setFont("Helvetica", 10)
    c.drawCentredString(PAGE_W / 2, 1.95 * inch, _layout_label(book.seed))
    c.setFont("Helvetica", 7)
    c.drawCentredString(PAGE_W / 2, 1.75 * inch, "same # = same dungeon if you reprint")
    c.setFont("Helvetica", 9)
    c.drawCentredString(
        PAGE_W / 2,
        1.5 * inch,
        f"{len(book.floors)} floors · HP = {STARTING_HP_BASE} + d6",
    )
    draw_icon(c, "die", PAGE_W / 2 - 0.85 * inch, 1.1 * inch, 0.28 * inch, center=True)
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W / 2 + 0.1 * inch, 1.05 * inch, "Pencil + d6 required")
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(PAGE_W / 2, 0.65 * inch, "Print on 4×6 photo paper · Survive")


def _wrap(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if len(trial) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_rules(c: canvas.Canvas, book: Book) -> None:
    c.setStrokeColor(black)
    c.setLineWidth(1.2)
    c.rect(MARGIN * 0.7, MARGIN * 0.7, PAGE_W - 1.4 * MARGIN, PAGE_H - 1.4 * MARGIN)

    title_y = PAGE_H - MARGIN - 0.1 * inch
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(PAGE_W / 2, title_y, "RULES")

    left = MARGIN + 0.08 * inch
    max_chars = 46
    # Keep rules above the monster chart title
    chart_title_y = MARGIN + 1.15 * inch
    rules_floor = chart_title_y + 0.22 * inch
    start_y = title_y - 0.28 * inch

    prepared: list[tuple[str, list[list[str]]]] = []
    n_headings = 0
    n_bullet_lines = 0
    for heading, bullets in RULES_SECTIONS:
        wrapped = [_wrap(f"•  {b}", max_chars) for b in bullets]
        prepared.append((heading, wrapped))
        n_headings += 1
        n_bullet_lines += sum(len(w) for w in wrapped)

    n_gaps = max(n_headings - 1, 1)
    avail_h = start_y - rules_floor
    heading_step = 0.185 * inch
    line_step = 0.165 * inch
    content_h = n_headings * heading_step + n_bullet_lines * line_step
    # Prefer roomy section gaps; shrink line steps only if needed to fit
    section_gap = (avail_h - content_h) / n_gaps
    if section_gap < 0.08 * inch:
        scale = avail_h / (content_h + n_gaps * 0.08 * inch)
        heading_step *= scale
        line_step *= scale
        content_h = n_headings * heading_step + n_bullet_lines * line_step
        section_gap = (avail_h - content_h) / n_gaps

    y = start_y
    for si, (heading, wrapped_bullets) in enumerate(prepared):
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(black)
        c.drawString(left, y, heading)
        y -= heading_step
        c.setFont("Helvetica", 9)
        for lines in wrapped_bullets:
            for i, line in enumerate(lines):
                if i == 0:
                    c.drawString(left, y, line)
                else:
                    c.drawString(left + 0.16 * inch, y, line)
                y -= line_step
        if si < n_headings - 1:
            y -= section_gap

    # Monster damage chart along the bottom
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(PAGE_W / 2, chart_title_y, "MONSTER DAMAGE")
    n = len(MONSTER_DAMAGE)
    gap = (PAGE_W - 2 * MARGIN) / n
    for i, (icon, name, dmg) in enumerate(MONSTER_DAMAGE):
        cx = MARGIN + gap * i + gap / 2
        draw_icon(c, icon, cx, MARGIN + 0.75 * inch, 0.28 * inch, center=True)
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx, MARGIN + 0.46 * inch, name)
        c.drawCentredString(cx, MARGIN + 0.28 * inch, f"−{dmg} HP")


def draw_shop(c: canvas.Canvas, book: Book) -> None:
    top = PAGE_H - MARGIN - 0.14 * inch
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PAGE_W / 2, top, "DUNGEON MERCHANT")
    draw_icon(c, "shop", PAGE_W / 2 - 1.35 * inch, top + 0.04 * inch, 0.28 * inch, center=True)

    c.setFont("Helvetica", 7.5)
    c.drawCentredString(
        PAGE_W / 2,
        top - 0.26 * inch,
        "Stop on the merchant chest to buy. Mimics bite (−2 HP).",
    )

    y = top - 0.52 * inch
    box_h = 0.70 * inch
    cost_w = 0.58 * inch
    used_w = 0.62 * inch
    row_w = PAGE_W - 2 * MARGIN
    main_w = row_w - cost_w - used_w

    for item in SHOP_ITEMS:
        c.setStrokeColor(black)
        c.setLineWidth(1)
        x0 = MARGIN
        y0 = y - box_h

        # Three cells: item | cost | used
        c.rect(x0, y0, main_w, box_h, fill=0, stroke=1)
        c.rect(x0 + main_w, y0, cost_w, box_h, fill=0, stroke=1)
        c.rect(x0 + main_w + cost_w, y0, used_w, box_h, fill=0, stroke=1)

        icon_name = SHOP_ICONS.get(item.name)
        if icon_name:
            draw_icon(
                c,
                icon_name,
                x0 + 0.32 * inch,
                y0 + box_h / 2,
                0.38 * inch,
                center=True,
            )

        text_x = x0 + 0.62 * inch
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(text_x, y0 + box_h - 0.28 * inch, item.name)
        c.setFont("Helvetica", 7.5)
        c.drawString(text_x, y0 + 0.18 * inch, item.effect)

        # Cost cell: coin + price, centered
        cost_cx = x0 + main_w + cost_w / 2
        draw_icon(c, "coin", cost_cx, y0 + box_h / 2 + 0.1 * inch, 0.2 * inch, center=True)
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(cost_cx, y0 + 0.14 * inch, str(item.cost))

        # Used/Owned cell: label + checkbox, centered
        used_cx = x0 + main_w + cost_w + used_w / 2
        marker = item.marker.upper()
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(used_cx, y0 + box_h - 0.22 * inch, marker)
        check = 0.22 * inch
        c.setLineWidth(1.2)
        c.rect(used_cx - check / 2, y0 + 0.14 * inch, check, check, fill=0, stroke=1)

        y -= box_h + 0.06 * inch

    # Write-in starting HP from dice roll
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(
        PAGE_W / 2,
        MARGIN + 0.4 * inch,
        f"START: ROLL D6 → HP = {STARTING_HP_BASE} + ____ = ____ · {STARTING_COINS} {CURRENCY}",
    )
    c.setFont("Helvetica", 8)
    c.drawCentredString(PAGE_W / 2, MARGIN + 0.14 * inch, _layout_label(book.seed))


def draw_floor(c: canvas.Canvas, floor: Floor) -> None:
    y = PAGE_H - MARGIN
    y = _draw_header_boxes(c, y, f"Floor {floor.number}")

    legend_h = 1.0 * inch
    avail_h = y - MARGIN - legend_h
    avail_w = PAGE_W - 2 * FLOOR_SIDE
    rows = len(floor.grid)
    cols = len(floor.grid[0])
    cell = min(avail_w / cols, avail_h / rows)
    grid_w = cols * cell
    grid_h = rows * cell
    x0 = (PAGE_W - grid_w) / 2
    # Sit the grid just above the legend (minimal wasted gap)
    y0 = MARGIN + legend_h + max(0, (avail_h - grid_h) * 0.35)

    _draw_grid(c, floor, x0, y0, cell)
    _draw_legend(c, MARGIN + 0.14 * inch)


def draw_stats(c: canvas.Canvas, book: Book) -> None:
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(PAGE_W / 2, PAGE_H - MARGIN - 0.14 * inch, "FINAL STATS")

    c.setFont("Helvetica", 9)
    c.drawCentredString(
        PAGE_W / 2,
        PAGE_H - MARGIN - 0.42 * inch,
        "Bob made it out.",
    )

    y = PAGE_H - 1.3 * inch
    fields = [
        ("Deaths", "________"),
        ("Final HP", "________"),
        (f"Final {CURRENCY}", "________"),
        ("Started", "________"),
        ("Finished", "________"),
        ("Adventurer", "________"),
    ]
    c.setFont("Helvetica", 12)
    for label, blank in fields:
        c.drawString(MARGIN + 0.25 * inch, y, f"{label.upper()}:")
        c.drawString(MARGIN + 1.7 * inch, y, blank)
        y -= 0.42 * inch

    c.setFont("Helvetica", 7)
    c.drawCentredString(
        PAGE_W / 2,
        MARGIN + 0.32 * inch,
        "Print on 4×6 photo paper",
    )
    c.setFont("Helvetica", 8)
    c.drawCentredString(PAGE_W / 2, MARGIN + 0.1 * inch, _layout_label(book.seed))


def render_pocket_pdf(book: Book, path: Path) -> None:
    """Write a PDF with true 4×6\" pages (photo paper)."""
    c = canvas.Canvas(str(path), pagesize=(PAGE_W, PAGE_H))

    draw_cover(c, book)
    c.showPage()
    draw_rules(c, book)
    c.showPage()
    draw_shop(c, book)
    c.showPage()
    for floor in book.floors:
        draw_floor(c, floor)
        c.showPage()
    draw_stats(c, book)
    c.showPage()
    c.save()


def _page_drawers(book: Book):
    drawers = [
        lambda c: draw_cover(c, book),
        lambda c: draw_rules(c, book),
        lambda c: draw_shop(c, book),
    ]
    for floor in book.floors:
        drawers.append(lambda c, f=floor: draw_floor(c, f))
    drawers.append(lambda c: draw_stats(c, book))
    return drawers


def render_letter_2up(book: Book, path: Path) -> None:
    """US Letter sheets with two 4×6 pages side-by-side and crop marks."""
    letter_w, letter_h = letter
    drawers = _page_drawers(book)

    y = (letter_h - PAGE_H) / 2
    positions = [
        (0.25 * inch, y),
        (0.25 * inch + PAGE_W + 0.25 * inch, y),
    ]

    c = canvas.Canvas(str(path), pagesize=letter)
    for i in range(0, len(drawers), 2):
        batch = drawers[i : i + 2]
        for idx, drawer in enumerate(batch):
            ox, oy = positions[idx]
            c.saveState()
            c.translate(ox, oy)
            p = c.beginPath()
            p.rect(0, 0, PAGE_W, PAGE_H)
            c.clipPath(p, stroke=0, fill=0)
            drawer(c)
            c.restoreState()
            _crop_marks(c, ox, oy, PAGE_W, PAGE_H)

        c.setFont("Helvetica", 8)
        c.drawCentredString(
            letter_w / 2,
            0.25 * inch,
            f"Bob's Pocket Dungeon · seed {book.seed} · sheet {i // 2 + 1}",
        )
        c.showPage()
    c.save()


render_letter_4up = render_letter_2up


def _crop_marks(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    mark = 0.12 * inch
    gap = 0.04 * inch
    c.setStrokeColor(black)
    c.setLineWidth(0.4)
    for px, py, dx, dy in (
        (x, y + h, -1, 1),
        (x + w, y + h, 1, 1),
        (x, y, -1, -1),
        (x + w, y, 1, -1),
    ):
        c.line(px + dx * gap, py, px + dx * (gap + mark), py)
        c.line(px, py + dy * gap, px, py + dy * (gap + mark))
