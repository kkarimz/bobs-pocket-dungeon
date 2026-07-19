import { useEffect, useRef, useState } from "react";
import {
  applyStartingHp,
  armBomb,
  armKey,
  buyItem,
  clearPendingStairs,
  clearSave,
  closeShop,
  createNewRun,
  descendStairs,
  endTurnIfStuck,
  hasSave,
  legalMoves,
  loadRun,
  openStairsGate,
  pathTo,
  rerollWithFeather,
  saveRun,
  startTurnRoll,
  stepTo,
  usePotion,
} from "./game/engine";
import type { RunState } from "./game/engine";
import type { Coord } from "./game/dungeon";
import { DEFAULT_FLOORS } from "./game/rules";
import { TitleScreen } from "./components/TitleScreen";
import { PlayScreen } from "./components/PlayScreen";
import { StatsScreen } from "./components/StatsScreen";

type AppMode = "title" | "play";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function App() {
  const [mode, setMode] = useState<AppMode>("title");
  const [run, setRun] = useState<RunState | null>(null);
  const [walking, setWalking] = useState(false);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!run) return;
    if (run.screen === "play" || run.screen === "stats") saveRun(run);
  }, [run]);

  // Softlock guard: leftover move points with nowhere to step
  useEffect(() => {
    if (!run || walking || run.screen !== "play") return;
    const fixed = endTurnIfStuck(run);
    if (fixed !== run) {
      setRun(fixed);
      runRef.current = fixed;
    }
  }, [run, walking]);

  const startNew = () => {
    // Fresh entropy every run so layouts never repeat across sessions
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    const s = (buf[0]! ^ buf[1]! ^ (Date.now() >>> 0)) >>> 0 || 1;
    clearSave();
    setWalking(false);
    setRun(createNewRun(s, DEFAULT_FLOORS));
    setMode("play");
  };

  const continueSave = () => {
    const saved = loadRun();
    if (saved) {
      setRun({ ...saved, floaters: saved.floaters ?? [], shake: false });
      setMode("play");
    }
  };

  const walkTo = async (dest: Coord) => {
    const current = runRef.current;
    if (!current || walking || current.screen !== "play") return;
    if (current.startingHp <= 0) return;
    const path = pathTo(current, dest);
    if (!path?.length) return;

    setWalking(true);
    let state = current;
    for (const step of path) {
      const prev = state;
      state = stepTo(state, step);
      setRun(state);
      runRef.current = state;
      if (
        state.screen !== "play" ||
        state.shopOpen ||
        state.pendingStairs ||
        state.hp <= 0 ||
        state.movesLeft <= 0 ||
        (state.pos[0] === prev.pos[0] &&
          state.pos[1] === prev.pos[1] &&
          state.movesLeft === prev.movesLeft)
      ) {
        break;
      }
      await sleep(100);
    }
    state = endTurnIfStuck(state);
    setRun(state);
    runRef.current = state;
    setWalking(false);
  };

  if (!run || mode === "title") {
    return (
      <TitleScreen
        hasContinue={hasSave()}
        onNew={startNew}
        onContinue={continueSave}
      />
    );
  }

  if (run.screen === "stats") {
    return (
      <StatsScreen
        run={run}
        onNew={startNew}
        onTitle={() => {
          clearSave();
          setRun(null);
          setMode("title");
        }}
      />
    );
  }

  const needsHp = run.startingHp <= 0;
  const moves = walking || needsHp ? [] : legalMoves(run);

  return (
    <PlayScreen
      run={run}
      legal={moves}
      walking={walking}
      onStartingHp={(v) => setRun(applyStartingHp(run, v))}
      onRolled={(v) => setRun(startTurnRoll(run, v))}
      onReroll={(v) => setRun(rerollWithFeather(run, v))}
      onGoTo={walkTo}
      onDescend={() => setRun(descendStairs(run))}
      onStayAtGate={() => setRun(clearPendingStairs(run))}
      onOpenGate={() => setRun(openStairsGate(run))}
      onBuy={(id) => setRun(buyItem(run, id))}
      onCloseShop={() => setRun(closeShop(run))}
      onPotion={() => setRun(usePotion(run))}
      onBomb={() => setRun(armBomb(run))}
      onKey={() => setRun(armKey(run))}
      onQuit={() => {
        saveRun(run);
        setRun(null);
        setMode("title");
      }}
    />
  );
}
