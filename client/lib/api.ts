import type { Player, Team, DrawRequest, DrawResponse } from "@shared/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    throw new Error((err as any).error || `Erro ${res.status}`);
  }
  return (await res.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const r = await fetch(path, init);
    return await json<T>(r);
  } catch (e: any) {
    const host = typeof window !== "undefined" ? window.location.host : "";
    if (host.includes(".fly.dev") && typeof window !== "undefined") {
      const alt = window.location.origin.replace(
        ".fly.dev",
        ".projects.builder.codes",
      );
      const r2 = await fetch(new URL(path, alt).toString(), init);
      return await json<T>(r2);
    }
    throw e;
  }
}

export const api = {
  // Teams
  listTeams: () => request<Team[]>("/api/teams"),
  createTeam: (data: Partial<Team>) =>
    request<Team>("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateTeam: (id: number, data: Partial<Team>) =>
    request<Team>(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteTeam: (id: number) =>
    request<{ ok: true }>(`/api/teams/${id}`, { method: "DELETE" }),

  // Players
  listPlayers: () => request<Player[]>("/api/players"),
  createPlayer: (data: Partial<Player>) =>
    request<Player>("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updatePlayer: (id: number, data: Partial<Player>) =>
    request<Player>(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deletePlayer: (id: number) =>
    request<{ ok: true }>(`/api/players/${id}`, { method: "DELETE" }),

  drawTeams: (data: DrawRequest) =>
    request<DrawResponse>("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getLineup: (teamId: number) => request<any>(`/api/teams/${teamId}/lineup`),
  saveLineup: (teamId: number, data: any) =>
    request<any>(`/api/teams/${teamId}/lineup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Matches
  listMatches: () => request<any[]>(`/api/matches`),
  generateMatches: (teamIds: number[]) =>
    request<{ matches: any[] }>(`/api/matches/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds }),
    }),
  getMatch: (id: number) => request<any>(`/api/matches/${id}`),
  addEvent: (id: number, data: any) =>
    request<any>(`/api/matches/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteEvent: (matchId: number, eventId: number) =>
    request<{ ok: true }>(`/api/matches/${matchId}/events/${eventId}`, {
      method: "DELETE",
    }),

  // Dev utilities
  devSeed: () =>
    request<{ ok: true; teamCount: number }>("/api/dev/seed", {
      method: "POST",
    }),
  devClear: () => request<{ ok: true }>("/api/dev/clear", { method: "POST" }),
};
