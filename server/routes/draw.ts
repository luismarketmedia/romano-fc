import { RequestHandler } from "express";
import { all, get, insert, run } from "../db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const drawTeams: RequestHandler = async (req, res) => {
  const { teamCount, paidOnly = true, apply = false } = req.body ?? {};
  const n = Number(teamCount);
  if (!n || n < 2) return res.status(400).json({ error: "Informe a quantidade de times (>= 2)" });

  const eligible = await all(
    `SELECT * FROM players WHERE (? = 0 OR paid = 1) ORDER BY RANDOM()`,
    [paidOnly ? 1 : 0],
  );

  const positions = ["GOL", "DEF", "MEI", "ATA"] as const;
  const buckets: Record<string, any[]> = {};
  for (const p of positions) buckets[p] = [];
  for (const pl of eligible as any[]) buckets[pl.position].push(pl);
  for (const p of positions) buckets[p] = shuffle(buckets[p]);

  const result: { name: string; players: any[] }[] = Array.from({ length: n }, (_, i) => ({ name: `Time ${i + 1}`, players: [] }));

  for (const pos of positions) {
    const list = buckets[pos];
    for (let i = 0; i < list.length; i++) {
      result[i % n].players.push(list[i]);
    }
  }

  if (apply) {
    for (let i = 0; i < n; i++) {
      const name = `Time ${i + 1}`;
      let team = await get<any>("SELECT * FROM teams WHERE name = ?", [name]);
      if (!team) {
        const id = await insert("INSERT INTO teams (name) VALUES (?)", [name]);
        team = await get<any>("SELECT * FROM teams WHERE id = ?", [id]);
      }
      const teamId = team.id as number;
      const ids = result[i].players.map((p) => p.id);
      for (const pid of ids) {
        await run("UPDATE players SET team_id = ? WHERE id = ?", [teamId, pid]);
      }
    }
  }

  res.json({ teams: result, total: (eligible as any[]).length });
};
