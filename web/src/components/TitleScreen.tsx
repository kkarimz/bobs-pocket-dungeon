import { iconUrl } from "../game/icons";
import { MONSTER_DAMAGE } from "../game/rules";

interface Props {
  hasContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
}

export function TitleScreen({ hasContinue, onNew, onContinue }: Props) {
  return (
    <div className="screen title-screen">
      <img src={iconUrl("bob")} alt="" className="hero-icon" />
      <h1>BOB'S POCKET DUNGEON</h1>
      <p className="tagline">Solo roll-and-crawl · tap your path</p>

      <button type="button" className="btn primary big" onClick={onNew}>
        New Run
      </button>

      {hasContinue && (
        <button type="button" className="btn" onClick={onContinue}>
          Continue
        </button>
      )}

      <section className="rules-brief">
        <h2>QUICK RULES</h2>
        <ul>
          <li>Roll d6 for starting HP = 6 + roll.</li>
          <li>Each turn: roll — EVEN straight, ODD diagonal only (no cutting wall corners).</li>
          <li>Tap highlighted cells to move up to the roll. No steps? Roll again.</li>
          <li>Enter a monster → lose HP (chart below). Coins +1 GOLD. Chests sell. Portals end the turn.</li>
          <li>Stairs go deeper. At 0 HP you die, reset, and continue.</li>
        </ul>
        <h3 className="rules-chart-title">MONSTER DAMAGE</h3>
        <ul className="monster-damage-chart" aria-label="Monster damage">
          {MONSTER_DAMAGE.map((m) => (
            <li key={m.icon}>
              <img src={iconUrl(m.icon)} alt="" draggable={false} />
              <span className="monster-name">{m.name}</span>
              <span className="monster-dmg">−{m.damage} HP</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
