import { RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { all, get, insert, run, getDb } from "../db";

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export const seedAndDraw: RequestHandler = async (_req, res) => {
  const file = path.join(process.cwd(), "server", "seed.sql");
  const sql = fs.readFileSync(file, "utf8");
  const db = await getDb();
  db.run(sql);

  // Draw into existing or new teams
  const teams = await all<any>(`SELECT id, name FROM teams ORDER BY id`);
  const teamCount = teams.length;

  const eligible = await all<any>(`SELECT * FROM players WHERE paid = 1 ORDER BY RANDOM()`);
  const positions = ["GOL", "DEF", "ALAD", "ALAE", "MEI", "ATA"] as const;
  const buckets: Record<string, any[]> = {} as any;
  for (const p of positions) buckets[p] = [];
  for (const pl of eligible) buckets[pl.position].push(pl);

  const result: { players: any[] }[] = Array.from({ length: teamCount }, () => ({ players: [] }));
  const pop = (pos: string, idx: number) => { const p = buckets[pos].shift(); if (p) result[idx].players.push(p); };
  for (let i = 0; i < teamCount; i++) {
    pop("GOL", i); pop("DEF", i); pop("ALAD", i); pop("ALAE", i); pop("MEI", i); pop("ATA", i);
  }
  let leftovers = ([] as any[]).concat(...positions.map((p) => buckets[p]));
  leftovers = shuffle(leftovers);
  let t = 0; while (leftovers.length) { result[t % teamCount].players.push(leftovers.shift()); t++; }

  // Apply
  for (let i = 0; i < teamCount; i++) {
    const teamId = teams[i].id as number;
    for (const pl of result[i].players) {
      await run(`UPDATE players SET team_id = ? WHERE id = ?`, [teamId, pl.id]);
    }
  }

  // Generate matches
  const ids = shuffle(teams.map((t) => t.id));
  for (let i = 0; i < ids.length; i += 2) {
    const a = ids[i]; const b = ids[i + 1]; if (a && b) await insert(`INSERT INTO matches (team_a_id, team_b_id) VALUES (?, ?)`, [a, b]);
  }

  res.json({ ok: true, teamCount });
};

export const clearDb: RequestHandler = async (_req, res) => {
  await run(`DELETE FROM match_events`);
  await run(`DELETE FROM matches`);
  await run(`DELETE FROM players`);
  await run(`DELETE FROM lineups`);
  await run(`DELETE FROM teams`);
  res.json({ ok: true });
};
