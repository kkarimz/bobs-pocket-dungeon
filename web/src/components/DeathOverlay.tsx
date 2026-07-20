import { iconUrl } from "../game/icons";

interface Props {
  deaths: number;
  floorFrom: number;
  floorTo: number;
  startingHp: number;
  isFinal: boolean;
  onContinue: () => void;
}

/** Full-screen pause when HP hits 0 — must acknowledge before continuing. */
export function DeathOverlay({
  deaths,
  floorFrom,
  floorTo,
  startingHp,
  isFinal,
  onContinue,
}: Props) {
  return (
    <div
      className="death-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="death-title"
    >
      <div className="death-card">
        <img src={iconUrl("bob")} alt="" className="death-icon" />
        <h2 id="death-title">YOU DIED</h2>
        <p className="death-count">Death #{deaths}</p>
        <p className="death-detail">
          {isFinal
            ? `Fell on floor ${floorFrom}. The run ends here.`
            : `Floor ${floorFrom} → Floor ${floorTo}. Gold lost. HP resets to ${startingHp}.`}
        </p>
        <button type="button" className="btn primary big" onClick={onContinue}>
          {isFinal ? "See results" : "Continue"}
        </button>
      </div>
    </div>
  );
}
