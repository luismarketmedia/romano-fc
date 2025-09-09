import { RequestHandler } from "express";
import { col, getNextId, nowIso } from "../db";

export const listTeams: RequestHandler = async (_req, res) => {
  const teams = await (
    await col<any>("teams")
  )
    .aggregate([
      {
        $lookup: {
          from: "players",
          let: { teamId: "$id" },
          pipeline: [{ $match: { $expr: { $eq: ["$team_id", "$$teamId"] } } }],
          as: "players",
        },
      },
      { $addFields: { playerCount: { $size: "$players" } } },
      { $project: { players: 0, _id: 0 } },
      { $sort: { created_at: -1 } },
    ])
    .toArray();
  res.json(teams);
};

export const createTeam: RequestHandler = async (req, res) => {
  const { name, color, line_count, formation, reserves_count } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nome do time é obrigatório" });
  }
  const id = await getNextId("teams");
  const doc = {
    id,
    name,
    color: color ?? null,
    line_count: line_count ?? null,
    formation: formation ?? null,
    reserves_count: reserves_count ?? null,
    created_at: nowIso(),
  };
  await (await col("teams")).insertOne(doc as any);
  res.status(201).json(doc);
};

export const updateTeam: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { name, color, line_count, formation, reserves_count } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const teams = await col<any>("teams");
  const cur = await teams.findOne({ id });
  if (!cur) return res.status(404).json({ error: "Time não encontrado" });
  const $set: any = {};
  if (name !== undefined) $set.name = name;
  if (color !== undefined) $set.color = color;
  if (line_count !== undefined) $set.line_count = line_count;
  if (formation !== undefined) $set.formation = formation;
  if (reserves_count !== undefined) $set.reserves_count = reserves_count;
  await teams.updateOne({ id }, { $set });
  const team = await teams.findOne({ id }, { projection: { _id: 0 } });
  res.json(team);
};

export const deleteTeam: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const teams = await col("teams");
  const cur = await teams.findOne({ id });
  if (!cur) return res.status(404).json({ error: "Time não encontrado" });
  await (
    await col("players")
  ).updateMany({ team_id: id }, { $set: { team_id: null } });
  await teams.deleteOne({ id });
  res.json({ ok: true });
};
