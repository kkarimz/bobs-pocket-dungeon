import { useEffect, useState, type ReactNode } from "react";
import { rollD6 } from "../game/engine";

interface Props {
  rolling: boolean;
  value: number | null;
  onRollRequest: () => void;
  onRolled: (value: number) => void;
  disabled?: boolean;
  label?: string;
  size?: "md" | "lg";
  hint?: string;
  /** Compact die for the side rail */
  variant?: "default" | "rail";
  /** Even = straight, odd = diagonal — lights the face frame */
  diagonal?: boolean;
  /** Remaining steps this turn (shown in the center while moving) */
  movesLeft?: number;
}

function DirFrame({
  diagonal,
  active,
  center,
}: {
  diagonal: boolean;
  active: boolean;
  center: ReactNode;
}) {
  return (
    <span
      className={`die-frame ${active ? (diagonal ? "diag" : "orth") : "idle"}`}
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const orth = i === 1 || i === 3 || i === 5 || i === 7;
        const diag = i === 0 || i === 2 || i === 6 || i === 8;
        const isCenter = i === 4;
        const on = active && (diagonal ? diag : orth);
        return (
          <i
            key={i}
            className={`die-frame-cell${on ? " on" : ""}${isCenter ? " hub" : ""}`}
          >
            {isCenter ? center : null}
          </i>
        );
      })}
    </span>
  );
}

/** Tap to roll — number + direction fused into one tile. */
export function DiceRoller({
  rolling,
  value,
  onRollRequest,
  onRolled,
  disabled,
  label = "Tap die to roll",
  size = "md",
  hint,
  variant = "default",
  diagonal = false,
  movesLeft = 0,
}: Props) {
  const [display, setDisplay] = useState<number | null>(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!rolling) {
      setDisplay(value);
      return;
    }
    setAnimating(true);
    const final = rollD6();
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      setDisplay(1 + Math.floor(Math.random() * 6));
      if (ticks >= 12) {
        window.clearInterval(id);
        setDisplay(final);
        setAnimating(false);
        onRolled(final);
      }
    }, 70);
    return () => window.clearInterval(id);
  }, [rolling]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rolling && !animating) setDisplay(value);
  }, [value, rolling, animating]);

  const busy = disabled || animating || rolling;
  const face = display && display >= 1 && display <= 6 ? display : null;
  const canRoll = !busy;
  const modeActive = face !== null && !animating;

  let center: ReactNode;
  if (animating && face !== null) {
    center = <span className="die-num">{face}</span>;
  } else if (movesLeft > 0) {
    center = <span className="die-num">{movesLeft}</span>;
  } else if (face !== null) {
    center = <span className="die-num">{face}</span>;
  } else {
    center = <span className="die-roll-label">ROLL</span>;
  }

  const modeLabel = !modeActive
    ? ""
    : diagonal
      ? "diagonal"
      : "straight";

  return (
    <div
      className={`dice-roller size-${size} variant-${variant} ${busy && !animating ? "is-disabled" : ""}`}
    >
      <button
        type="button"
        className={[
          "dice-face",
          animating ? "tumbling" : "",
          canRoll ? "can-roll" : "",
          face === null ? "is-idle" : "",
          modeActive ? (diagonal ? "mode-diag" : "mode-orth") : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={busy}
        onClick={onRollRequest}
        aria-label={
          modeLabel ? `${label} (${modeLabel}, ${movesLeft || face} left)` : label
        }
      >
        <DirFrame diagonal={diagonal} active={modeActive} center={center} />
      </button>
      {variant !== "rail" && !busy && hint ? (
        <span className="dice-hint">{hint}</span>
      ) : null}
      {variant !== "rail" && animating ? (
        <span className="dice-hint">Rolling…</span>
      ) : null}
    </div>
  );
}
