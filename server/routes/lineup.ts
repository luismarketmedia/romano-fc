import { RequestHandler } from "express";
import { col, nowIso } from "../db";

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
  const teams = await col("teams");
  const team = await teams.findOne({ id: teamId });
  if (!team) return res.status(404).json({ error: "Time não encontrado" });
  const lineups = await col<any>("lineups");
  let lineup: any = await lineups.findOne(
    { team_id: teamId },
    { projection: { _id: 0 } },
  );
  if (!lineup) lineup = { team_id: teamId, ...emptyLineup };
  const players = await (
    await col("players")
  )
    .find({ team_id: teamId }, { projection: { _id: 0, id: 1, name: 1 } })
    .sort({ name: 1 })
    .toArray();

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
      await lineups.updateOne(
        { team_id: teamId },
        {
          $set: {
            goleiro: next.goleiro ?? null,
            ala_direito: next.ala_direito ?? null,
            ala_esquerdo: next.ala_esquerdo ?? null,
            frente: next.frente ?? null,
            zag: next.zag ?? null,
            meio: next.meio ?? null,
            reserva1: next.reserva1 ?? null,
            reserva2: next.reserva2 ?? null,
            updated_at: nowIso(),
          },
        },
        { upsert: true },
      );
      lineup = next;
    }
  }

  res.json({ lineup, players });
};

export const saveLineup: RequestHandler = async (req, res) => {
  const teamId = Number(req.params.id);
  if (!teamId) return res.status(400).json({ error: "ID inválido" });
  const team = await (await col("teams")).findOne({ id: teamId });
  if (!team) return res.status(404).json({ error: "Time não encontrado" });
  const body = req.body ?? {};
  const lineups = await col("lineups");
  await lineups.updateOne(
    { team_id: teamId },
    {
      $set: {
        goleiro: body.goleiro ?? null,
        ala_direito: body.ala_direito ?? null,
        ala_esquerdo: body.ala_esquerdo ?? null,
        frente: body.frente ?? null,
        zag: body.zag ?? null,
        meio: body.meio ?? null,
        reserva1: body.reserva1 ?? null,
        reserva2: body.reserva2 ?? null,
        updated_at: nowIso(),
      },
    },
    { upsert: true },
  );
  const lineup = await lineups.findOne(
    { team_id: teamId },
    { projection: { _id: 0 } },
  );
  res.json({ lineup });
};
