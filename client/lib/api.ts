import type { Player, Team, DrawRequest, DrawResponse } from "@shared/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error((err as any).error || `Erro ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  // Teams
  listTeams: () => fetch("/api/teams").then((r) => json<Team[]>(r)),
  createTeam: (data: Partial<Team>) =>
    fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Team>(r)),
  updateTeam: (id: number, data: Partial<Team>) =>
    fetch(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Team>(r)),
  deleteTeam: (id: number) =>
    fetch(`/api/teams/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),

  // Players
  listPlayers: () => fetch("/api/players").then((r) => json<Player[]>(r)),
  createPlayer: (data: Partial<Player>) =>
    fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Player>(r)),
  updatePlayer: (id: number, data: Partial<Player>) =>
    fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Player>(r)),
  deletePlayer: (id: number) =>
    fetch(`/api/players/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),

  drawTeams: (data: DrawRequest) =>
    fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<DrawResponse>(r)),

  getLineup: (teamId: number) => fetch(`/api/teams/${teamId}/lineup`).then((r) => json<any>(r)),
  saveLineup: (teamId: number, data: any) =>
    fetch(`/api/teams/${teamId}/lineup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<any>(r)),

  // Matches
  listMatches: () => fetch(`/api/matches`).then((r) => json<any[]>(r)),
  generateMatches: (teamIds: number[]) =>
    fetch(`/api/matches/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds }),
    }).then((r) => json<{ matches: any[] }>(r)),
  getMatch: (id: number) => fetch(`/api/matches/${id}`).then((r) => json<any>(r)),
  addEvent: (id: number, data: any) =>
    fetch(`/api/matches/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<any>(r)),
  deleteEvent: (matchId: number, eventId: number) =>
    fetch(`/api/matches/${matchId}/events/${eventId}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
};
