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

  // Sanitize lineup: remove players no longer on this team
  if (lineup && lineup.team_id) {
    const validIds = new Set((players as any[]).map((p) => p.id));
    const keys = Object.keys(emptyLineup) as (keyof typeof emptyLineup)[];
    let changed = false;
    const next: any = { ...lineup };
    for (const k of keys) {
      const val = lineup[k as string];
      if (val != null && !validIds.has(val)) {
        next[k as string] = null;
        changed = true;
      }
    }
    if (changed) {
      await run(
        `UPDATE lineups SET goleiro=?, ala_direito=?, ala_esquerdo=?, frente=?, zag=?, meio=?, reserva1=?, reserva2=?, updated_at=datetime('now') WHERE team_id=?`,
        [
          next.goleiro ?? null,
          next.ala_direito ?? null,
          next.ala_esquerdo ?? null,
          next.frente ?? null,
          next.zag ?? null,
          next.meio ?? null,
          next.reserva1 ?? null,
          next.reserva2 ?? null,
          teamId,
        ],
      );
      lineup = next;
    }
  }

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
