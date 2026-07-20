#!/usr/bin/env npx tsx
/**
 * Monte Carlo balance report for Bob's Pocket Dungeon.
 *
 * Bot: roll d6 (even=ortho, odd=diag), path toward exit; buy potion/shield at shop.
 * Death: advance to next floor, HP refilled, gold wiped (matches game rules).
 *
 * Usage:
 *   cd web && npm run balance
 *   cd web && npm run balance -- --seeds 100 --runs 30
 *   cd web && npm run balance -- --seed 42 --runs 80
 */

import { simulateSeed, summarize } from "../src/game/sim";
import { DEFAULT_FLOORS } from "../src/game/rules";

function parseArgs(argv: string[]) {
  let seed: number | null = null;
  let seeds = 80;
  let runs = 25;
  let floors = DEFAULT_FLOORS;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed" && argv[i + 1]) seed = Number.parseInt(argv[++i]!, 10);
    else if (a === "--seeds" && argv[i + 1])
      seeds = Number.parseInt(argv[++i]!, 10);
    else if (a === "--runs" && argv[i + 1])
      runs = Number.parseInt(argv[++i]!, 10);
    else if (a === "--floors" && argv[i + 1])
      floors = Number.parseInt(argv[++i]!, 10);
  }
  return { seed, seeds, runs, floors };
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function fmt(x: number, d = 1) {
  return x.toFixed(d);
}

const { seed, seeds, runs, floors } = parseArgs(process.argv.slice(2));

console.log("Bob's Pocket Dungeon balance sim");
console.log(
  `Bot: path-to-exit · shop potion/shield · death skips floor (${floors} floors)\n`,
);

if (seed != null) {
  const stats = simulateSeed(seed, runs, floors);
  console.log(`Book #${seed}  (${runs} runs)`);
  console.log(`  Win rate:       ${pct(stats.winRate)}`);
  console.log(`  Avg deaths:     ${fmt(stats.avgDeaths)}`);
  console.log(`  Avg floors clr: ${fmt(stats.avgFloorsCleared)}`);
  console.log(`  Avg turns:      ${fmt(stats.avgTurns, 0)}`);
  console.log(`  Avg fights:     ${fmt(stats.avgFights)}`);
  console.log(`  Avg damage:     ${fmt(stats.avgDamage)} HP`);
  console.log(`  Avg coins:      ${fmt(stats.avgCoins)}`);
  console.log(`  Avg gold end:   ${fmt(stats.avgGoldEnd)} G`);
  process.exit(0);
}

const all = Array.from({ length: seeds }, (_, i) =>
  simulateSeed(i + 1, runs, floors),
);
const s = summarize(all);

console.log(`${seeds} books × ${runs} runs each\n`);
console.log("Overall:");
console.log(`  Win rate:         ${pct(s.winRate)}`);
console.log(`  Avg deaths/run:   ${fmt(s.avgDeaths)}`);
console.log(`  Avg floors clear: ${fmt(s.avgFloorsCleared)} / ${floors}`);
console.log(`  Avg turns/run:    ${fmt(s.avgTurns, 0)}`);
console.log(`  Avg fights/run:   ${fmt(s.avgFights)}`);
console.log(`  Avg damage/run:   ${fmt(s.avgDamage)} HP`);
console.log(`  Avg coins/run:    ${fmt(s.avgCoins)}`);
console.log(`  Avg gold end:     ${fmt(s.avgGoldEnd)} G`);

const brutal = [...all].sort((a, b) => a.winRate - b.winRate).slice(0, 5);
const easy = [...all].sort((a, b) => b.winRate - a.winRate).slice(0, 5);

console.log("\nHardest seeds (low win rate):");
for (const m of brutal) {
  console.log(
    `  #${m.seed}  win ${pct(m.winRate)}  deaths ${fmt(m.avgDeaths)}  floors ${fmt(m.avgFloorsCleared)}`,
  );
}

console.log("\nEasiest seeds:");
for (const m of easy) {
  console.log(
    `  #${m.seed}  win ${pct(m.winRate)}  deaths ${fmt(m.avgDeaths)}  floors ${fmt(m.avgFloorsCleared)}`,
  );
}

console.log(
  "\nTip: npm run balance -- --seed 42 --runs 80  for one book detail",
);
