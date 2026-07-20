import type { RunState } from "../game/engine";
import { MoreFromKappz } from "./MoreFromKappz";

interface Props {
  run: RunState;
  onNew: () => void;
  onTitle: () => void;
}

export function StatsScreen({ run, onNew, onTitle }: Props) {
  return (
    <div className="screen stats-screen">
      <h1>{run.won ? "DUNGEON CLEARED" : "RUN OVER"}</h1>
      <p className="layout">Layout #{run.seed}</p>
      <dl className="stats-list">
        <div>
          <dt>Deaths</dt>
          <dd>{run.deaths}</dd>
        </div>
        <div>
          <dt>Final HP</dt>
          <dd>{run.hp}</dd>
        </div>
        <div>
          <dt>Final Gold</dt>
          <dd>{run.gold}</dd>
        </div>
        <div>
          <dt>Floors</dt>
          <dd>
            {Math.min(run.floorIndex + 1, run.book.floors.length)} /{" "}
            {run.book.floors.length}
          </dd>
        </div>
      </dl>
      <button type="button" className="btn primary" onClick={onNew}>
        New Run
      </button>
      <button type="button" className="btn" onClick={onTitle}>
        Title
      </button>
      <MoreFromKappz />
    </div>
  );
}
