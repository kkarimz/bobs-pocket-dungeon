import { useState } from "react";
import type { RulesMode } from "../game/engine";
import type { DebugFlags } from "../game/debug";
import { saveDebugFlags } from "../game/debug";

interface Props {
  flags: DebugFlags;
  onFlags: (flags: DebugFlags) => void;
  rulesMode: RulesMode;
  onSetRulesMode: (mode: RulesMode) => void;
  onGiveGold: () => void;
  onHeal: () => void;
  onGiveItems: () => void;
  onSetMoves: () => void;
  onNextFloor: () => void;
}

/** Collapsible testing panel — only mounted when ?debug=true. */
export function DebugPanel({
  flags,
  onFlags,
  rulesMode,
  onSetRulesMode,
  onGiveGold,
  onHeal,
  onGiveItems,
  onSetMoves,
  onNextFloor,
}: Props) {
  const [open, setOpen] = useState(true);

  const setFlag = (patch: Partial<DebugFlags>) => {
    const next = { ...flags, ...patch };
    saveDebugFlags(next);
    onFlags(next);
  };

  return (
    <div className={`debug-panel ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="debug-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "DBG ▾" : "DBG"}
      </button>
      {open && (
        <div className="debug-body">
          <p className="debug-title">Debug</p>
          <div className="debug-rules-mode">
            <span className="debug-rules-label">Rules</span>
            <button
              type="button"
              className={`btn tiny ${rulesMode === "classic" ? "primary" : ""}`}
              onClick={() => onSetRulesMode("classic")}
            >
              Classic
            </button>
            <button
              type="button"
              className={`btn tiny ${rulesMode === "persistent" ? "primary" : ""}`}
              onClick={() => onSetRulesMode("persistent")}
            >
              Persistent
            </button>
          </div>
          <label className="debug-check">
            <input
              type="checkbox"
              checked={flags.freeMove}
              onChange={(e) => setFlag({ freeMove: e.target.checked })}
            />
            Free move (tap any cell)
          </label>
          <label className="debug-check">
            <input
              type="checkbox"
              checked={flags.revealSecrets}
              onChange={(e) => setFlag({ revealSecrets: e.target.checked })}
            />
            Reveal mimics
          </label>
          <div className="debug-actions">
            <button type="button" className="btn tiny" onClick={onGiveGold}>
              +10 gold
            </button>
            <button type="button" className="btn tiny" onClick={onHeal}>
              +5 HP
            </button>
            <button type="button" className="btn tiny" onClick={onGiveItems}>
              All items
            </button>
            <button type="button" className="btn tiny" onClick={onSetMoves}>
              6 moves
            </button>
            <button type="button" className="btn tiny" onClick={onNextFloor}>
              Next floor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
