import { RequestHandler } from "express";
import { col, getNextId, nowIso } from "../db";

export const listMatches: RequestHandler = async (_req, res) => {
  const matches = await (await col<any>("matches"))
    .find({}, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();
  const teams = await (await col<any>("teams")).find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
  const nameById = new Map<number, string>(teams.map((t: any) => [t.id, t.name]));
  const events = await (await col<any>("match_events")).find({}, { projection: { _id: 0, match_id: 1, team_id: 1, type: 1 } }).toArray();
  const scoreA = new Map<number, number>();
  const scoreB = new Map<number, number>();
  for (const m of matches) {
    scoreA.set(m.id, 0);
    scoreB.set(m.id, 0);
  }
  for (const e of events) {
    if (e.type !== "GOAL") continue;
    const m = matches.find((mm) => mm.id === e.match_id);
    if (!m) continue;
    if (e.team_id === m.team_a_id) scoreA.set(m.id, (scoreA.get(m.id) || 0) + 1);
    if (e.team_id === m.team_b_id) scoreB.set(m.id, (scoreB.get(m.id) || 0) + 1);
  }
  const rows = matches.map((m) => ({
    ...m,
    team_a_name: nameById.get(m.team_a_id),
    team_b_name: nameById.get(m.team_b_id),
    score_a: scoreA.get(m.id) || 0,
    score_b: scoreB.get(m.id) || 0,
  }));
  res.json(rows);
};

export const getMatch: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const matches = await col<any>("matches");
  const teams = await col<any>("teams");
  const m = await matches.findOne({ id }, { projection: { _id: 0 } });
  if (!m) return res.status(404).json({ error: "Partida não encontrada" });
  const ta = await teams.findOne({ id: m.team_a_id });
  const tb = await teams.findOne({ id: m.team_b_id });
  const match = { ...m, team_a_name: ta?.name, team_b_name: tb?.name };
  const aPlayers = await (await col("players"))
    .find({ team_id: m.team_a_id }, { projection: { _id: 0, id: 1, name: 1, number: 1 } })
    .sort({ name: 1 })
    .toArray();
  const bPlayers = await (await col("players"))
    .find({ team_id: m.team_b_id }, { projection: { _id: 0, id: 1, name: 1, number: 1 } })
    .sort({ name: 1 })
    .toArray();
  const events = await (await col<any>("match_events"))
    .aggregate([
      { $match: { match_id: id } },
      {
        $lookup: {
          from: "players",
          localField: "player_id",
          foreignField: "id",
          as: "player",
        },
      },
      { $addFields: { player_name: { $ifNull: [{ $first: "$player.name" }, null] } } },
      { $project: { _id: 0, player: 0 } },
      { $sort: { created_at: 1 } },
    ])
    .toArray();
  res.json({ match, aPlayers, bPlayers, events });
};

export const createMatch: RequestHandler = async (req, res) => {
  const { team_a_id, team_b_id, scheduled_at, stage } = req.body ?? {};
  if (!team_a_id || !team_b_id)
    return res.status(400).json({ error: "Times obrigatórios" });
  const id = await getNextId("matches");
  const doc = {
    id,
    team_a_id,
    team_b_id,
    scheduled_at: scheduled_at ?? null,
    stage: stage ?? "classificatoria",
    status: "scheduled",
    created_at: nowIso(),
  };
  await (await col("matches")).insertOne(doc as any);
  res.status(201).json(doc);
};

export const updateMatch: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { status, scheduled_at, stage } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const matches = await col<any>("matches");
  const $set: any = {};
  if (status !== undefined) $set.status = status;
  if (scheduled_at !== undefined) $set.scheduled_at = scheduled_at;
  if (stage !== undefined) $set.stage = stage;
  await matches.updateOne({ id }, { $set });
  const match = await matches.findOne({ id }, { projection: { _id: 0 } });
  res.json(match);
};

export const addEvent: RequestHandler = async (req, res) => {
  const matchId = Number(req.params.id);
  const { team_id, player_id, type, minute } = req.body ?? {};
  if (!matchId || !team_id || !player_id || !type)
    return res.status(400).json({ error: "Dados do evento incompletos" });

  const eventsCol = await col<any>("match_events");
  if (type === "STAR") {
    const existing = await eventsCol.find({ match_id: matchId, type: "STAR" }).toArray();
    if (existing.length) {
      const hasSame = existing.some((e) => e.player_id === player_id);
      await eventsCol.deleteMany({ match_id: matchId, type: "STAR" });
      if (hasSame) return res.json({ ok: true, removed: true });
    }
  }

  const id = await getNextId("match_events");
  const doc = {
    id,
    match_id: matchId,
    team_id,
    player_id,
    type,
    minute: minute ?? null,
    created_at: nowIso(),
  };
  await eventsCol.insertOne(doc);
  res.status(201).json(doc);
};

export const deleteEvent: RequestHandler = async (req, res) => {
  const matchId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!matchId || !eventId)
    return res.status(400).json({ error: "IDs inválidos" });
  await (await col("match_events")).deleteOne({ id: eventId, match_id: matchId });
  res.json({ ok: true });
};

export const generateMatches: RequestHandler = async (req, res) => {
  const { teamIds } = req.body ?? {};
  if (!Array.isArray(teamIds) || teamIds.length < 2)
    return res.status(400).json({ error: "Lista de times inválida" });
  const ids = [...teamIds].sort(() => Math.random() - 0.5);
  const created: any[] = [];
  const matches = await col("matches");
  for (let i = 0; i < ids.length; i += 2) {
    const a = ids[i];
    const b = ids[i + 1];
    if (a && b) {
      const id = await getNextId("matches");
      const m = {
        id,
        team_a_id: a,
        team_b_id: b,
        status: "scheduled",
        stage: "classificatoria",
        created_at: nowIso(),
      };
      await matches.insertOne(m as any);
      created.push(m);
    }
  }
  res.json({ matches: created });
};
