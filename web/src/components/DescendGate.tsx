import { iconUrl } from "../game/icons";

interface Props {
  floorFrom: number;
  floorTo: number;
  isLast: boolean;
  onDescend: () => void;
  onStay: () => void;
}

export function DescendGate({
  floorFrom,
  floorTo,
  isLast,
  onDescend,
  onStay,
}: Props) {
  return (
    <div className="descend-gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <img src={iconUrl("exit")} alt="" className="descend-gate-icon" />
      <h2 id="gate-title">THE GATE</h2>
      <p>
        {isLast
          ? `Floor ${floorFrom} · leave the dungeon`
          : `Floor ${floorFrom} → Floor ${floorTo}`}
      </p>
      <p className="descend-gate-note">Carry HP & gold with you.</p>
      <button type="button" className="btn primary big" onClick={onDescend}>
        {isLast ? "Finish" : "Descend"}
      </button>
      <button type="button" className="btn gate-stay" onClick={onStay}>
        Not yet
      </button>
    </div>
  );
}
