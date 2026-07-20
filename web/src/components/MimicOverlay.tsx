import { iconUrl } from "../game/icons";

interface Props {
  damage: number;
  blocked: boolean;
  onContinue: () => void;
}

/** Surprise reveal when a disguised chest turns out to be a mimic. */
export function MimicOverlay({ damage, blocked, onContinue }: Props) {
  return (
    <div
      className="mimic-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mimic-title"
    >
      <div className="mimic-card">
        <img src={iconUrl("mimic")} alt="" className="mimic-icon" />
        <h2 id="mimic-title">MIMIC!</h2>
        <p className="mimic-detail">
          {blocked
            ? "Your bomb swallowed the bite."
            : `The chest was alive. −${damage} HP.`}
        </p>
        <button type="button" className="btn primary big" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
