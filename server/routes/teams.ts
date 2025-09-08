import { RequestHandler } from "express";
import { all, get, insert, run } from "../db";

export const listTeams: RequestHandler = async (_req, res) => {
  const rows = await all(
    `SELECT t.*, (SELECT COUNT(1) FROM players p WHERE p.team_id = t.id) as playerCount
     FROM teams t
     ORDER BY t.created_at DESC`
  );
  res.json(rows);
};

export const createTeam: RequestHandler = async (req, res) => {
  const { name, color, line_count, formation, reserves_count } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nome do time é obrigatório" });
  }
  const id = await insert("INSERT INTO teams (name, color, line_count, formation, reserves_count) VALUES (?, ?, ?, ?, ?)", [
    name,
    color ?? null,
    line_count ?? null,
    formation ?? null,
    reserves_count ?? null,
  ]);
  const team = await get("SELECT * FROM teams WHERE id = ?", [id]);
  res.status(201).json(team);
};

export const updateTeam: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { name, color, line_count, formation, reserves_count } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur = await get("SELECT * FROM teams WHERE id = ?", [id]);
  if (!cur) return res.status(404).json({ error: "Time não encontrado" });
  await run(
    "UPDATE teams SET name = COALESCE(?, name), color = COALESCE(?, color), line_count = COALESCE(?, line_count), formation = COALESCE(?, formation), reserves_count = COALESCE(?, reserves_count) WHERE id = ?",
    [name ?? null, color ?? null, line_count ?? null, formation ?? null, reserves_count ?? null, id],
  );
  const team = await get("SELECT * FROM teams WHERE id = ?", [id]);
  res.json(team);
};

export const deleteTeam: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur = await get("SELECT * FROM teams WHERE id = ?", [id]);
  if (!cur) return res.status(404).json({ error: "Time não encontrado" });
  await run("UPDATE players SET team_id = NULL WHERE team_id = ?", [id]);
  await run("DELETE FROM teams WHERE id = ?", [id]);
  res.json({ ok: true });
};
