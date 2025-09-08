import { RequestHandler } from "express";
import { all, get, insert, run } from "../db";

export const listPlayers: RequestHandler = async (_req, res) => {
  const rows = await all(
    `SELECT p.*, t.name as team_name FROM players p LEFT JOIN teams t ON t.id = p.team_id ORDER BY p.created_at DESC`
  );
  res.json(rows);
};

export const createPlayer: RequestHandler = async (req, res) => {
  const { name, position, paid, team_id } = req.body ?? {};
  if (!name || typeof name !== "string") return res.status(400).json({ error: "Nome é obrigatório" });
  if (!position || !["GOL","DEF","MEI","ATA"].includes(position)) return res.status(400).json({ error: "Posição inválida" });
  const id = await insert("INSERT INTO players (name, position, paid, team_id) VALUES (?, ?, ?, ?)", [
    name,
    position,
    paid ? 1 : 0,
    team_id ?? null,
  ]);
  const player = await get("SELECT * FROM players WHERE id = ?", [id]);
  res.status(201).json(player);
};

export const updatePlayer: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur: any = await get("SELECT * FROM players WHERE id = ?", [id]);
  if (!cur) return res.status(404).json({ error: "Jogador não encontrado" });
  const { name, position, paid, team_id } = req.body ?? {};
  const nextPaid = typeof paid === "boolean" ? (paid ? 1 : 0) : null;
  const nextTeamId = team_id === undefined ? cur.team_id : team_id;
  await run(
    "UPDATE players SET name = COALESCE(?, name), position = COALESCE(?, position), paid = COALESCE(?, paid), team_id = ? WHERE id = ?",
    [name ?? null, position ?? null, nextPaid, nextTeamId, id],
  );
  const player = await get("SELECT * FROM players WHERE id = ?", [id]);
  res.json(player);
};

export const deletePlayer: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur = await get("SELECT * FROM players WHERE id = ?", [id]);
  if (!cur) return res.status(404).json({ error: "Jogador não encontrado" });
  await run("DELETE FROM players WHERE id = ?", [id]);
  res.json({ ok: true });
};
