import { RequestHandler } from "express";
import { db } from "../db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const drawTeams: RequestHandler = (req, res) => {
  const { teamCount, paidOnly = true, apply = false } = req.body ?? {};
  const n = Number(teamCount);
  if (!n || n < 2) return res.status(400).json({ error: "Informe a quantidade de times (>= 2)" });

  const eligible = db.prepare(
    `SELECT * FROM players WHERE (? = 0 OR paid = 1) ORDER BY RANDOM()`
  ).all(paidOnly ? 1 : 0);

  const positions = ["GOL","DEF","MEI","ATA"] as const;
  const buckets: Record<string, any[]> = {};
  for (const p of positions) buckets[p] = [];
  for (const pl of eligible) buckets[pl.position].push(pl);
  for (const p of positions) buckets[p] = shuffle(buckets[p]);

  const result: { name: string; players: any[] }[] = Array.from({ length: n }, (_, i) => ({ name: `Time ${i + 1}`, players: [] }));

  for (const pos of positions) {
    const list = buckets[pos];
    for (let i = 0; i < list.length; i++) {
      result[i % n].players.push(list[i]);
    }
  }

  if (apply) {
    // Ensure teams exist or create them
    for (let i = 0; i < n; i++) {
      const name = `Time ${i + 1}`;
      let team = db.prepare("SELECT * FROM teams WHERE name = ?").get(name);
      if (!team) {
        const info = db.prepare("INSERT INTO teams (name) VALUES (?)").run(name);
        team = db.prepare("SELECT * FROM teams WHERE id = ?").get(info.lastInsertRowid);
      }
      const teamId = team.id as number;
      const ids = result[i].players.map((p) => p.id);
      const update = db.prepare("UPDATE players SET team_id = ? WHERE id = ?");
      const tx = db.transaction((ids: number[]) => {
        for (const pid of ids) update.run(teamId, pid);
      });
      tx(ids);
    }
  }

  res.json({ teams: result, total: eligible.length });
};
