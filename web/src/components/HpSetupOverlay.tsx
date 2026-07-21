import { useState } from "react";
import { DiceRoller } from "./DiceRoller";
import { STARTING_HP_BASE } from "../game/rules";

interface Props {
  onRolled: (value: number) => void;
}

/** Overlay on the play map — roll 6 + d6 for starting HP. */
export function HpSetupOverlay({ onRolled }: Props) {
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);

  const hp = roll !== null ? STARTING_HP_BASE + roll : null;
  const done = roll !== null && !rolling;

  return (
    <div
      className="hp-setup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hp-setup-title"
    >
      <div className="hp-setup-card">
        <h2 id="hp-setup-title">STARTING HP</h2>
        <p className="hp-setup-formula">HP = 6 + d6</p>
        <DiceRoller
          rolling={rolling}
          value={roll}
          size="lg"
          variant="rail"
          label="Tap die for starting HP"
          disabled={done}
          onRollRequest={() => {
            if (rolling || done) return;
            setRolling(true);
          }}
          onRolled={(v) => {
            setRoll(v);
            setRolling(false);
          }}
        />
        {done ? (
          <>
            <p className="hp-setup-result">
              Rolled <strong>{roll}</strong>
              <span aria-hidden> → </span>
              <strong className="hp-setup-total">{hp} HP</strong>
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => onRolled(roll!)}
            >
              Begin
            </button>
          </>
        ) : (
          <p className="hp-setup-hint">Tap the die to begin</p>
        )}
      </div>
    </div>
  );
}
