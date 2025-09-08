import { RequestHandler } from "express";
import { db } from "../db";

export const listTeams: RequestHandler = (_req, res) => {
  const rows = db.prepare(`
    SELECT t.*, (
      SELECT COUNT(1) FROM players p WHERE p.team_id = t.id
    ) as playerCount
    FROM teams t
    ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
};

export const createTeam: RequestHandler = (req, res) => {
  const { name, color } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nome do time é obrigatório" });
  }
  const stmt = db.prepare("INSERT INTO teams (name, color) VALUES (?, ?)");
  const info = stmt.run(name, color ?? null);
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(team);
};

export const updateTeam: RequestHandler = (req, res) => {
  const id = Number(req.params.id);
  const { name, color } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const cur = db.prepare("SELECT * FROM teams WHERE id = ?").get(id);
  if (!cur) return res.status(404).json({ error: "Time não encontrado" });
  const stmt = db.prepare("UPDATE teams SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?");
  stmt.run(name ?? null, color ?? null, id);
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(id);
  res.json(team);
};

export const deleteTeam: RequestHandler = (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  db.prepare("UPDATE players SET team_id = NULL WHERE team_id = ?").run(id);
  const info = db.prepare("DELETE FROM teams WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Time não encontrado" });
  res.json({ ok: true });
};
