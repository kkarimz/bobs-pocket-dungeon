interface Props {
  hasContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
}

export function TitleScreen({ hasContinue, onNew, onContinue }: Props) {
  return (
    <div className="screen title-screen">
      <img src="/icons/bob.png" alt="" className="hero-icon" />
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
          <li>Each turn: roll — EVEN straight, ODD diagonal.</li>
          <li>Tap highlighted cells to move up to the roll.</li>
          <li>Monsters hurt, coins pay, chests sell, portals end the turn.</li>
          <li>Stairs go deeper. At 0 HP you die, reset, and continue.</li>
        </ul>
      </section>
    </div>
  );
}
