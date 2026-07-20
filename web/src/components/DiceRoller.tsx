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

/** Tap to roll — parchment number tile (keeps last result; idle shows ROLL). */
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
  const canRoll = !busy;

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
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={busy}
        onClick={onRollRequest}
        aria-label={label}
      >
        {face !== null ? (
          <span className="die-num" aria-hidden>
            {face}
          </span>
        ) : (
          <span className="die-roll-label" aria-hidden>
            ROLL
          </span>
        )}
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
