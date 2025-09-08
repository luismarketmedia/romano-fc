import { RequestHandler } from "express";
import { all, get, insert, run } from "../db";

const emptyLineup = {
  goleiro: null,
  ala_direito: null,
  ala_esquerdo: null,
  frente: null,
  zag: null,
  meio: null,
  reserva1: null,
  reserva2: null,
};

export const getLineup: RequestHandler = async (req, res) => {
  const teamId = Number(req.params.id);
  if (!teamId) return res.status(400).json({ error: "ID inválido" });
  const team = await get("SELECT * FROM teams WHERE id = ?", [teamId]);
  if (!team) return res.status(404).json({ error: "Time não encontrado" });
  let lineup: any = await get("SELECT * FROM lineups WHERE team_id = ?", [
    teamId,
  ]);
  if (!lineup) lineup = { team_id: teamId, ...emptyLineup };
  const players = await all(
    `SELECT id, name FROM players WHERE team_id = ? ORDER BY name`,
    [teamId],
  );
  res.json({ lineup, players });
};

export const saveLineup: RequestHandler = async (req, res) => {
  const teamId = Number(req.params.id);
  if (!teamId) return res.status(400).json({ error: "ID inválido" });
  const team = await get("SELECT * FROM teams WHERE id = ?", [teamId]);
  if (!team) return res.status(404).json({ error: "Time não encontrado" });
  const body = req.body ?? {};
  const values = [
    body.goleiro ?? null,
    body.ala_direito ?? null,
    body.ala_esquerdo ?? null,
    body.frente ?? null,
    body.zag ?? null,
    body.meio ?? null,
    body.reserva1 ?? null,
    body.reserva2 ?? null,
  ];
  const existing = await get("SELECT team_id FROM lineups WHERE team_id = ?", [
    teamId,
  ]);
  if (existing) {
    await run(
      `UPDATE lineups SET goleiro=?, ala_direito=?, ala_esquerdo=?, frente=?, zag=?, meio=?, reserva1=?, reserva2=?, updated_at=datetime('now') WHERE team_id=?`,
      [...values, teamId],
    );
  } else {
    await run(
      `INSERT INTO lineups (goleiro, ala_direito, ala_esquerdo, frente, zag, meio, reserva1, reserva2, team_id) VALUES (?,?,?,?,?,?,?,?,?)`,
      [...values, teamId],
    );
  }
  const lineup = await get("SELECT * FROM lineups WHERE team_id = ?", [teamId]);
  res.json({ lineup });
};
