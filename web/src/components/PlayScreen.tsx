import { useState } from "react";
import type { Coord } from "../game/dungeon";
import type { RunState } from "../game/engine";
import { EXIT } from "../game/rules";
import type { ShopItemId } from "../game/rules";
import { iconUrl } from "../game/icons";
import { DungeonGrid } from "./DungeonGrid";
import { MerchantModal } from "./MerchantModal";
import { DiceRoller } from "./DiceRoller";
import { DescendGate } from "./DescendGate";
import { DeathOverlay } from "./DeathOverlay";
import { HpSetupOverlay } from "./HpSetupOverlay";

/** Short banner text — never show stacked legacy roll/mode prompts. */
function statusLine(run: RunState): string {
  if (run.startingHp <= 0) return "Roll starting HP.";
  if (run.pendingDeath) return run.message.trim() || "You died.";
  if (run.pendingStairs) return "The gate awaits.";
  if (run.shopOpen) return "Merchant.";

  const raw = run.message.trim();
  const legacy =
    /Rolled \d+|tap a cell to dash|diagonal\)|straight\)|·\s*Roll again|No moves from here/i.test(
      raw,
    );
  const event =
    /^(Monster|Hit|\+1 GOLD|Bomb|Key|No damage|Potion|Bought|Not enough|Portal|Death|BLOCKED|No )/i.test(
      raw,
    ) ||
    raw.includes("−") ||
    raw.startsWith("Starting HP") ||
    raw.startsWith("Floor ");

  if (run.movesLeft > 0) {
    if (!legacy && event) return raw;
    return run.diagonal
      ? "Tap a cell (diagonal)."
      : "Tap a cell (straight).";
  }

  if (!legacy && event) return raw;
  if (!legacy && (raw === "Roll again." || raw === "Roll to move.")) return raw;
  return "Roll to move.";
}

interface Props {
  run: RunState;
  legal: Coord[];
  walking: boolean;
  onStartingHp: (value: number) => void;
  onRolled: (value: number) => void;
  onReroll: (value: number) => void;
  onGoTo: (c: Coord) => void;
  onDescend: () => void;
  onStayAtGate: () => void;
  onOpenGate: () => void;
  onBuy: (id: ShopItemId) => void;
  onCloseShop: () => void;
  onPotion: () => void;
  onBomb: () => void;
  onKey: () => void;
  onQuit: () => void;
  onAcknowledgeDeath: () => void;
}

export function PlayScreen({
  run,
  legal,
  walking,
  onStartingHp,
  onRolled,
  onReroll,
  onGoTo,
  onDescend,
  onStayAtGate,
  onOpenGate,
  onBuy,
  onCloseShop,
  onPotion,
  onBomb,
  onKey,
  onQuit,
  onAcknowledgeDeath,
}: Props) {
  const [rolling, setRolling] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  const needsHp = run.startingHp <= 0;
  const canRoll =
    !needsHp &&
    !run.pendingDeath &&
    run.movesLeft <= 0 &&
    !run.pendingStairs &&
    !run.shopOpen &&
    !rolling &&
    !walking;
  const featherReady =
    run.inventory["lucky-feather"] &&
    !run.inventory.usedFeather &&
    run.die !== null &&
    run.movesLeft > 0 &&
    !rerolling &&
    !walking &&
    !run.pendingDeath;

  const [px, py] = run.pos;
  const onStairs = !run.pendingStairs && run.grid[py]![px] === EXIT;
  const floorFrom = run.floorIndex + 1;
  const isLast = run.floorIndex + 1 >= run.book.floors.length;
  const floorTo = floorFrom + 1;
  const deathIsFinal = run.floorIndex + 1 >= run.book.floors.length;

  return (
    <div
      className={`screen play-screen ${run.pendingStairs ? "gate-open" : ""} ${needsHp ? "hp-setup-open" : ""} ${run.pendingDeath ? "death-open" : ""}`}
    >
      <div className="play-frame">
        <aside className="stat-rail" aria-label="Run stats">
          <div className="stat-rail-top">
            <button type="button" className="hud-menu" onClick={onQuit}>
              <span>MENU</span>
            </button>
            <div className="hud-stat">
              <span>FL</span>
              <strong>
                {floorFrom}/{run.book.floors.length}
              </strong>
            </div>
          </div>
          <div className="stat-rail-bottom">
            <div className="hud-stat">
              <span>HP</span>
              <strong>{run.hp}</strong>
            </div>
            <div className="hud-stat">
              <span>GOLD</span>
              <strong>{run.gold}</strong>
            </div>
            <div className="hud-stat">
              <span>DEATHS</span>
              <strong>{run.deaths}</strong>
            </div>
          </div>
        </aside>

        <div className="map-column">
          <header className="play-top">
            <div className="play-brand">
              <img src={iconUrl("bob")} alt="" className="play-logo" />
              <h1 className="play-title">BOB&apos;S POCKET DUNGEON</h1>
            </div>
            <p className="message status-banner">{statusLine(run)}</p>
          </header>

          <DungeonGrid
            run={run}
            legal={legal}
            pathPreview={[]}
            walking={walking}
            onGoTo={onGoTo}
          />
        </div>

        <aside className="side-rail">
          <div className="rail-die">
            <DiceRoller
              rolling={rolling || rerolling}
              value={run.die}
              disabled={rerolling ? rolling : !canRoll && !rolling}
              variant="rail"
              label={rerolling ? "Rerolling…" : "Tap die to roll"}
              onRollRequest={() => {
                if (rerolling || rolling || walking) return;
                if (!canRoll) return;
                setRolling(true);
              }}
              onRolled={(v) => {
                if (rerolling) {
                  setRerolling(false);
                  onReroll(v);
                  return;
                }
                setRolling(false);
                onRolled(v);
              }}
            />
            <div className="dice-meta">
              {run.die !== null && (
                <div
                  className={`rail-mode ${run.movesLeft <= 0 ? "is-spent" : ""}`}
                  title={run.diagonal ? "Diagonal moves" : "Straight moves"}
                >
                  <strong>{run.movesLeft > 0 ? run.movesLeft : "—"}</strong>
                  <span
                    className={`dir-pad ${run.diagonal ? "diag" : "orth"}`}
                    aria-label={run.diagonal ? "diagonal" : "orthogonal"}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                      const orth = i === 1 || i === 3 || i === 5 || i === 7;
                      const diag = i === 0 || i === 2 || i === 6 || i === 8;
                      const on = run.diagonal ? diag : orth;
                      return (
                        <i
                          key={i}
                          className={`dir-cell${on ? " on" : ""}${i === 4 ? " you" : ""}`}
                        />
                      );
                    })}
                  </span>
                </div>
              )}
              {featherReady && (
                <button
                  type="button"
                  className="btn tiny rail-action"
                  onClick={() => setRerolling(true)}
                >
                  Feather
                </button>
              )}
              {onStairs && (
                <button
                  type="button"
                  className="btn tiny rail-action"
                  onClick={onOpenGate}
                >
                  Gate
                </button>
              )}
            </div>
          </div>

          <div className="item-tray">
            <button
              type="button"
              className="item-btn"
              disabled={
                !run.inventory["healing-potion"] || run.inventory.usedPotion
              }
              onClick={onPotion}
              title="Healing Potion"
            >
              <img src={iconUrl("potion")} alt="Potion" />
            </button>
            <button
              type="button"
              className={`item-btn ${run.inventory["iron-shield"] ? "on" : ""}`}
              disabled={!run.inventory["iron-shield"]}
              title="Iron Shield"
            >
              <img src={iconUrl("shield")} alt="Shield" />
            </button>
            <button
              type="button"
              className={`item-btn ${run.bombArmed ? "armed" : ""}`}
              disabled={
                !run.inventory["blackpowder-bomb"] || run.inventory.usedBomb
              }
              onClick={onBomb}
              title="Bomb"
            >
              <img src={iconUrl("bomb")} alt="Bomb" />
            </button>
            <button
              type="button"
              className={`item-btn ${run.keyArmed ? "armed" : ""}`}
              disabled={!run.inventory["skeleton-key"] || run.inventory.usedKey}
              onClick={onKey}
              title="Skeleton Key"
            >
              <img src={iconUrl("key")} alt="Key" />
            </button>
            <button
              type="button"
              className="item-btn"
              disabled={
                !run.inventory["lucky-feather"] || run.inventory.usedFeather
              }
              title="Lucky Feather"
            >
              <img src={iconUrl("feather")} alt="Feather" />
            </button>
          </div>
        </aside>
      </div>

      <footer className="play-foot">
        <p>© {new Date().getFullYear()} Kappz LLC · All rights reserved.</p>
        <p className="play-foot-credits">
          Icons by Lorc &amp; Delapouite —{" "}
          <a href="https://game-icons.net" target="_blank" rel="noreferrer">
            game-icons.net
          </a>{" "}
          (CC BY 3.0)
        </p>
      </footer>

      {needsHp && <HpSetupOverlay onRolled={onStartingHp} />}

      {run.pendingDeath && (
        <DeathOverlay
          deaths={run.deaths}
          floorFrom={floorFrom}
          floorTo={floorTo}
          startingHp={run.startingHp}
          isFinal={deathIsFinal}
          onContinue={onAcknowledgeDeath}
        />
      )}

      {run.pendingStairs && (
        <DescendGate
          floorFrom={floorFrom}
          floorTo={floorTo}
          isLast={isLast}
          onDescend={onDescend}
          onStay={onStayAtGate}
        />
      )}

      {run.shopOpen && (
        <MerchantModal run={run} onBuy={onBuy} onClose={onCloseShop} />
      )}
    </div>
  );
}
