import { RequestHandler } from "express";
import { db } from "../db";

export const listPlayers: RequestHandler = (_req, res) => {
  const rows = db.prepare(
    `SELECT p.*, t.name as team_name FROM players p LEFT JOIN teams t ON t.id = p.team_id ORDER BY p.created_at DESC`
  ).all();
  res.json(rows);
};

export const createPlayer: RequestHandler = (req, res) => {
  const { name, position, paid, team_id } = req.body ?? {};
  if (!name || typeof name !== "string") return res.status(400).json({ error: "Nome é obrigatório" });
  if (!position || !["GOL","DEF","MEI","ATA"].includes(position)) return res.status(400).json({ error: "Posição inválida" });
  const stmt = db.prepare("INSERT INTO players (name, position, paid, team_id) VALUES (?, ?, ?, ?)");
  const info = stmt.run(name, position, paid ? 1 : 0, team_id ?? null);
  const player = db.prepare("SELECT * FROM players WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(player);
};

export const updatePlayer: RequestHandler = (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  if (!cur) return res.status(404).json({ error: "Jogador não encontrado" });
  const { name, position, paid, team_id } = req.body ?? {};
  const stmt = db.prepare(
    "UPDATE players SET name = COALESCE(?, name), position = COALESCE(?, position), paid = COALESCE(?, paid), team_id = ? WHERE id = ?",
  );
  stmt.run(
    name ?? null,
    position ?? null,
    typeof paid === "boolean" ? (paid ? 1 : 0) : null,
    team_id === undefined ? cur.team_id : team_id,
    id,
  );
  const player = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  res.json(player);
};

export const deletePlayer: RequestHandler = (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const info = db.prepare("DELETE FROM players WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Jogador não encontrado" });
  res.json({ ok: true });
};
