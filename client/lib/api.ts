import type { Player, Team, DrawRequest, DrawResponse } from "@shared/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  // Teams
  listTeams: () => fetch("/api/teams").then(json<Team[]>>()),
  createTeam: (data: Partial<Team>) =>
    fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<Team>>()),
  updateTeam: (id: number, data: Partial<Team>) =>
    fetch(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<Team>>()),
  deleteTeam: (id: number) =>
    fetch(`/api/teams/${id}`, { method: "DELETE" }).then(json<{ ok: true }>>()),

  // Players
  listPlayers: () => fetch("/api/players").then(json<Player[]>>()),
  createPlayer: (data: Partial<Player>) =>
    fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<Player>>()),
  updatePlayer: (id: number, data: Partial<Player>) =>
    fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<Player>>()),
  deletePlayer: (id: number) =>
    fetch(`/api/players/${id}`, { method: "DELETE" }).then(json<{ ok: true }>>()),

  drawTeams: (data: DrawRequest) =>
    fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<DrawResponse>>()),
};