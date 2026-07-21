import { useState } from "react";
import { DiceRoller } from "./DiceRoller";

interface Props {
  onRolled: (hp: number) => void;
}

/** Overlay on the play map — roll 2d6 for starting HP. */
export function HpSetupOverlay({ onRolled }: Props) {
  const [rolling, setRolling] = useState(false);
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);

  const which: 1 | 2 = die1 === null ? 1 : 2;
  const done = die1 !== null && die2 !== null && !rolling;
  const hp = done ? die1! + die2! : null;

  return (
    <div
      className="hp-setup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hp-setup-title"
    >
      <div className="hp-setup-card">
        <h2 id="hp-setup-title">STARTING HP</h2>
        <p className="hp-setup-formula">HP = 2d6</p>
        <DiceRoller
          rolling={rolling}
          value={which === 1 ? die1 : die2}
          size="lg"
          variant="rail"
          label={which === 1 ? "Tap die — first roll" : "Tap die — second roll"}
          disabled={done}
          onRollRequest={() => {
            if (rolling || done) return;
            setRolling(true);
          }}
          onRolled={(v) => {
            if (die1 === null) setDie1(v);
            else setDie2(v);
            setRolling(false);
          }}
        />
        {(die1 !== null || die2 !== null) && (
          <p className="hp-setup-result">
            {die1 !== null && (
              <>
                <strong>{die1}</strong>
              </>
            )}
            {die1 !== null && die2 !== null && <span aria-hidden> + </span>}
            {die2 !== null && <strong>{die2}</strong>}
            {hp !== null && (
              <>
                <span aria-hidden> → </span>
                <strong className="hp-setup-total">{hp} HP</strong>
              </>
            )}
          </p>
        )}
        {done ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => onRolled(hp!)}
          >
            Begin
          </button>
        ) : (
          <p className="hp-setup-hint">
            {die1 === null ? "Tap for the first die" : "Tap for the second die"}
          </p>
        )}
      </div>
    </div>
  );
}
