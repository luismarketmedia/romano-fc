import { RequestHandler } from "express";
import { col, getNextId, nowIso } from "../db";

export const listPlayers: RequestHandler = async (_req, res) => {
  const players = await (
    await col<any>("players")
  )
    .aggregate([
      {
        $lookup: {
          from: "teams",
          localField: "team_id",
          foreignField: "id",
          as: "team",
        },
      },
      {
        $addFields: {
          team_name: { $ifNull: [{ $first: "$team.name" }, null] },
        },
      },
      { $project: { team: 0, _id: 0 } },
      { $sort: { created_at: -1 } },
    ])
    .toArray();
  res.json(players);
};

export const createPlayer: RequestHandler = async (req, res) => {
  const { name, position, paid, team_id, number } = req.body ?? {};
  if (!name || typeof name !== "string")
    return res.status(400).json({ error: "Nome é obrigatório" });
  if (
    !position ||
    !["GOL", "DEF", "ALAD", "ALAE", "MEI", "ATA"].includes(position)
  )
    return res.status(400).json({ error: "Posição inválida" });
  const jersey = Number.isFinite(Number(number))
    ? Math.max(0, Math.min(99, Number(number)))
    : null;
  const id = await getNextId("players");
  const doc = {
    id,
    name,
    position,
    paid: paid ? 1 : 0,
    team_id: team_id ?? null,
    number: jersey,
    created_at: nowIso(),
  };
  await (await col("players")).insertOne(doc as any);
  res.status(201).json(doc);
};

export const updatePlayer: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const players = await col<any>("players");
  const cur = await players.findOne({ id });
  if (!cur) return res.status(404).json({ error: "Jogador não encontrado" });
  const { name, position, paid, team_id, number } = req.body ?? {};
  const nextPaid = typeof paid === "boolean" ? (paid ? 1 : 0) : undefined;
  const nextTeamId = team_id === undefined ? cur.team_id : team_id;
  const jersey =
    number === undefined
      ? undefined
      : Number.isFinite(Number(number))
        ? Math.max(0, Math.min(99, Number(number)))
        : null;
  const $set: any = {};
  if (name !== undefined) $set.name = name;
  if (position !== undefined) $set.position = position;
  if (nextPaid !== undefined) $set.paid = nextPaid;
  $set.team_id = nextTeamId;
  if (jersey !== undefined) $set.number = jersey;
  await players.updateOne({ id }, { $set });
  const player = await players.findOne({ id }, { projection: { _id: 0 } });
  res.json(player);
};

export const deletePlayer: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const players = await col("players");
  const cur = await players.findOne({ id });
  if (!cur) return res.status(404).json({ error: "Jogador não encontrado" });
  await players.deleteOne({ id });
  res.json({ ok: true });
};
