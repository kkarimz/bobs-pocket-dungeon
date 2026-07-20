import { useEffect, useState } from "react";
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
}

/** Classic d6 pip positions on a 3×3 grid (row-major indices 0–8). */
const PIP_LAYOUT: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiePips({ face }: { face: number | null }) {
  if (face === null) {
    return <span className="die-idle-mark" aria-hidden>?</span>;
  }
  const on = new Set(PIP_LAYOUT[face] ?? []);
  return (
    <span className={`die-pips face-${face}`} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={`die-pip${on.has(i) ? " on" : ""}`} />
      ))}
    </span>
  );
}

/** Tap the die to roll — no separate button. */
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

  return (
    <div
      className={`dice-roller size-${size} variant-${variant} ${busy && !animating ? "is-disabled" : ""}`}
    >
      <button
        type="button"
        className={`dice-face ${animating ? "tumbling" : ""} ${!busy ? "can-roll" : ""} ${face === null ? "is-idle" : ""}`}
        disabled={busy}
        onClick={onRollRequest}
        aria-label={label}
      >
        <DiePips face={face} />
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
