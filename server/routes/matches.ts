import { RequestHandler } from "express";
import { all, get, insert, run } from "../db";

export const listMatches: RequestHandler = async (_req, res) => {
  const rows = await all(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name,
      (SELECT COUNT(1) FROM match_events e WHERE e.match_id = m.id AND e.type='GOAL' AND e.team_id = m.team_a_id) AS score_a,
      (SELECT COUNT(1) FROM match_events e WHERE e.match_id = m.id AND e.type='GOAL' AND e.team_id = m.team_b_id) AS score_b
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     ORDER BY m.created_at DESC`,
  );
  res.json(rows);
};

export const getMatch: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  const match = await get(
    `SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = ?`,
    [id],
  );
  if (!match) return res.status(404).json({ error: "Partida não encontrada" });
  const aPlayers = await all(
    `SELECT id, name FROM players WHERE team_id = ? ORDER BY name`,
    [match.team_a_id],
  );
  const bPlayers = await all(
    `SELECT id, name FROM players WHERE team_id = ? ORDER BY name`,
    [match.team_b_id],
  );
  const events = await all(
    `SELECT e.*, p.name AS player_name FROM match_events e JOIN players p ON p.id = e.player_id WHERE e.match_id = ? ORDER BY e.created_at`,
    [id],
  );
  res.json({ match, aPlayers, bPlayers, events });
};

export const createMatch: RequestHandler = async (req, res) => {
  const { team_a_id, team_b_id, scheduled_at } = req.body ?? {};
  if (!team_a_id || !team_b_id)
    return res.status(400).json({ error: "Times obrigatórios" });
  const id = await insert(
    `INSERT INTO matches (team_a_id, team_b_id, scheduled_at) VALUES (?, ?, ?)`,
    [team_a_id, team_b_id, scheduled_at ?? null],
  );
  const match = await get(`SELECT * FROM matches WHERE id = ?`, [id]);
  res.status(201).json(match);
};

export const updateMatch: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const { status, scheduled_at } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "ID inválido" });
  await run(
    `UPDATE matches SET status = COALESCE(?, status), scheduled_at = COALESCE(?, scheduled_at) WHERE id = ?`,
    [status ?? null, scheduled_at ?? null, id],
  );
  const match = await get(`SELECT * FROM matches WHERE id = ?`, [id]);
  res.json(match);
};

export const addEvent: RequestHandler = async (req, res) => {
  const matchId = Number(req.params.id);
  const { team_id, player_id, type, minute } = req.body ?? {};
  if (!matchId || !team_id || !player_id || !type)
    return res.status(400).json({ error: "Dados do evento incompletos" });

  if (type === "STAR") {
    const existing: any[] = await all(
      `SELECT id, player_id FROM match_events WHERE match_id = ? AND type = 'STAR'`,
      [matchId],
    );
    if (existing.length) {
      const hasSame = existing.some((e) => e.player_id === player_id);
      await run(`DELETE FROM match_events WHERE match_id = ? AND type = 'STAR'`, [matchId]);
      if (hasSame) return res.json({ ok: true, removed: true });
    }
  }

  const id = await insert(
    `INSERT INTO match_events (match_id, team_id, player_id, type, minute) VALUES (?, ?, ?, ?, ?)`,
    [matchId, team_id, player_id, type, minute ?? null],
  );
  const event = await get(`SELECT * FROM match_events WHERE id = ?`, [id]);
  res.status(201).json(event);
};

export const deleteEvent: RequestHandler = async (req, res) => {
  const matchId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!matchId || !eventId)
    return res.status(400).json({ error: "IDs inválidos" });
  await run(`DELETE FROM match_events WHERE id = ? AND match_id = ?`, [
    eventId,
    matchId,
  ]);
  res.json({ ok: true });
};

export const generateMatches: RequestHandler = async (req, res) => {
  const { teamIds } = req.body ?? {};
  if (!Array.isArray(teamIds) || teamIds.length < 2)
    return res.status(400).json({ error: "Lista de times inválida" });
  const ids = [...teamIds].sort(() => Math.random() - 0.5);
  const created: any[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    const a = ids[i];
    const b = ids[i + 1];
    if (a && b) {
      const id = await insert(
        `INSERT INTO matches (team_a_id, team_b_id) VALUES (?, ?)`,
        [a, b],
      );
      const m = await get(`SELECT * FROM matches WHERE id = ?`, [id]);
      created.push(m);
    }
  }
  res.json({ matches: created });
};
