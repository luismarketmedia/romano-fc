/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type Position = "GOL" | "DEF" | "MEI" | "ATA";

export interface Team {
  id: number;
  name: string;
  color?: string | null;
  created_at?: string;
  playerCount?: number;
}

export interface Player {
  id: number;
  name: string;
  position: Position;
  paid: boolean | number; // server returns 0/1 sometimes
  team_id: number | null;
  created_at?: string;
  team_name?: string | null;
}

export interface DrawRequest {
  teamCount: number;
  paidOnly?: boolean;
  apply?: boolean;
}

export interface DrawResultTeam {
  name: string;
  players: Player[];
}

export interface DrawResponse {
  teams: DrawResultTeam[];
  total: number;
}

export interface Lineup {
  team_id: number;
  goleiro: number | null;
  ala_direito: number | null;
  ala_esquerdo: number | null;
  frente: number | null;
  zag: number | null;
  meio: number | null;
  reserva1: number | null;
  reserva2: number | null;
}

export interface LineupResponse {
  lineup: Partial<Lineup> & { team_id: number };
  players: Pick<Player, "id" | "name">[];
}
