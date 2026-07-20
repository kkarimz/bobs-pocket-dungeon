import { useMemo, useState } from "react";
import type { Coord } from "../game/dungeon";
import { DEFEATED, hintForCell, iconForCell } from "../game/rules";
import { iconUrl } from "../game/icons";
import type { RunState } from "../game/engine";

interface Props {
  run: RunState;
  legal: Coord[];
  pathPreview: Coord[];
  walking: boolean;
  revealSecrets?: boolean;
  onGoTo: (c: Coord) => void;
  onInspect: (hint: string) => void;
}

export function DungeonGrid({
  run,
  legal,
  pathPreview,
  walking,
  revealSecrets = false,
  onGoTo,
  onInspect,
}: Props) {
  const legalSet = useMemo(
    () => new Set(legal.map(([x, y]) => `${x},${y}`)),
    [legal],
  );
  const pathSet = useMemo(
    () => new Set(pathPreview.map(([x, y]) => `${x},${y}`)),
    [pathPreview],
  );
  const visited = new Set(run.visitedThisTurn);
  const [px, py] = run.pos;
  const hasMoves = legal.length > 0 && !walking;
  const [hover, setHover] = useState<string | null>(null);
  const hasShield = !!run.inventory["iron-shield"];

  const handleCell = (x: number, y: number, cell: string, isPos: boolean) => {
    if (walking) return;
    const k = `${x},${y}`;
    if (hasMoves && legalSet.has(k)) {
      onGoTo([x, y]);
      return;
    }
    const hint = hintForCell(cell, {
      isPlayer: isPos,
      hasShield,
      revealSecrets,
    });
    if (hint) onInspect(hint);
  };

  return (
    <div className={`grid-wrap ${run.shake ? "is-shaking" : ""}`}>
      <div
        className={`grid ${hasMoves ? "grid-choosing" : ""} ${walking ? "is-walking" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${run.grid[0]!.length}, minmax(0, 1fr))`,
        }}
      >
        {run.grid.map((row, y) =>
          row.map((cell, x) => {
            const k = `${x},${y}`;
            const isPos = x === px && y === py;
            const isLegal = legalSet.has(k);
            const onPath = pathSet.has(k) || hover === k;
            const isVisited = visited.has(k);
            const isDefeated = cell === DEFEATED;
            const icon = isPos
              ? "bob"
              : cell === "@"
                ? null
                : iconForCell(cell, { revealSecrets });
            const canInspect =
              isPos ||
              isDefeated ||
              (!!iconForCell(cell, { revealSecrets }) && cell !== "@") ||
              cell === "#";
            return (
              <button
                key={k}
                type="button"
                className={[
                  "cell",
                  isPos ? "cell-pos" : "",
                  isLegal ? "cell-legal" : "",
                  onPath && isLegal ? "cell-path" : "",
                  hasMoves && !isLegal && !isPos ? "cell-dim" : "",
                  isVisited && !isPos ? "cell-visited" : "",
                  cell === "#" ? "cell-wall" : "",
                  isDefeated && !isPos ? "cell-defeated" : "",
                  revealSecrets && cell === "M" ? "cell-debug-mimic" : "",
                  canInspect && !(hasMoves && isLegal) ? "cell-inspectable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={walking}
                onClick={() => handleCell(x, y, cell, isPos)}
                onPointerEnter={() => isLegal && setHover(k)}
                onPointerLeave={() => setHover(null)}
                aria-label={
                  isLegal && hasMoves
                    ? `Go to ${x},${y}`
                    : hintForCell(cell, {
                        isPlayer: isPos,
                        hasShield,
                        revealSecrets,
                      }) ?? `Cell ${x},${y}`
                }
              >
                {isPos && icon ? (
                  <img src={iconUrl(icon)} alt="" draggable={false} />
                ) : isDefeated ? (
                  <span className="cell-mark-x" aria-hidden>
                    ✕
                  </span>
                ) : icon ? (
                  <img src={iconUrl(icon)} alt="" draggable={false} />
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      <div className="floater-layer" aria-hidden>
        {run.floaters.map((f) => (
          <span key={f.id} className={`floater floater-${f.kind}`}>
            {f.text}
          </span>
        ))}
      </div>
    </div>
  );
}
