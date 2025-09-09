import { RequestHandler } from "express";
import { col, getNextId } from "../db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const seedAndDraw: RequestHandler = async (_req, res) => {
  // Create some demo teams and players if empty
  const teamsCol = await col<any>("teams");
  const playersCol = await col<any>("players");
  const countTeams = await teamsCol.countDocuments();
  if (countTeams === 0) {
    const t1 = {
      id: await getNextId("teams"),
      name: "Time 1",
      color: null,
      created_at: new Date().toISOString(),
    };
    const t2 = {
      id: await getNextId("teams"),
      name: "Time 2",
      color: null,
      created_at: new Date().toISOString(),
    };
    await teamsCol.insertMany([t1 as any, t2 as any]);
    const names = [
      "Ana",
      "Bruno",
      "Carlos",
      "Diana",
      "Edu",
      "Fabi",
      "Gabi",
      "Hugo",
      "Ivo",
      "Júlia",
      "Kiko",
      "Lia",
    ];
    const pos = ["GOL", "DEF", "ALAD", "ALAE", "MEI", "ATA"] as const;
    const docs = names.map((n, i) => ({
      id: i + 1,
      name: n,
      position: pos[i % pos.length],
      paid: i % 2 === 0 ? 1 : 0,
      team_id: i % 2 === 0 ? t1.id : t2.id,
      created_at: new Date().toISOString(),
    }));
    await playersCol.insertMany(docs as any);
  }

  const teams = await teamsCol
    .find({}, { projection: { _id: 0, id: 1, name: 1 } })
    .toArray();
  const teamCount = teams.length;

  // Generate some matches
  const ids = shuffle(teams.map((t) => t.id));
  const matchesCol = await col<any>("matches");
  for (let i = 0; i < ids.length; i += 2) {
    const a = ids[i];
    const b = ids[i + 1];
    if (a && b) {
      const id = await getNextId("matches");
      await matchesCol.insertOne({
        id,
        team_a_id: a,
        team_b_id: b,
        status: "scheduled",
        stage: "classificatoria",
        created_at: new Date().toISOString(),
      });
    }
  }

  res.json({ ok: true, teamCount });
};

export const clearDb: RequestHandler = async (_req, res) => {
  await (await col("match_events")).deleteMany({});
  await (await col("matches")).deleteMany({});
  await (await col("players")).deleteMany({});
  await (await col("lineups")).deleteMany({});
  await (await col("teams")).deleteMany({});
  await (await col("counters")).deleteMany({});
  res.json({ ok: true });
};
