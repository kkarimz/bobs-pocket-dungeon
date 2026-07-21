import { iconUrl } from "../game/icons";
import { MONSTER_DAMAGE } from "../game/rules";
import { MoreFromKappz } from "./MoreFromKappz";

interface Props {
  hasContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
}

export function TitleScreen({ hasContinue, onNew, onContinue }: Props) {
  return (
    <div className="screen title-screen">
      <img src={iconUrl("bob")} alt="" className="hero-icon" />
      <h1>BOB&apos;S POCKET DUNGEON</h1>
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
          <li>Roll 2d6 for starting HP.</li>
          <li>Each turn: EVEN = straight, ODD = diagonal only. No cutting wall corners.</li>
          <li>Tap highlighted cells to move up to the roll. No steps? Roll again.</li>
          <li>
            Enter a space: monsters hurt (chart) then leave an ✕ (defeated). Coins
            +1 GOLD; portals warp and end the turn.
          </li>
          <li>
            Several chests each floor — they all look the same. Most are
            merchants; one is a mimic (two from floor 9). Opening a mimic costs
            −2 HP. Tap stairs to go deeper.
          </li>
          <li>At 0 HP you die, reset HP/GOLD, skip to the next floor, and continue.</li>
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

      <MoreFromKappz />
      <p className="title-copy">
        © {new Date().getFullYear()} Kappz LLC · All rights reserved.
      </p>
    </div>
  );
}
