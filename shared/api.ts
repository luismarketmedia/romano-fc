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

export type Position = "GOL" | "DEF" | "ALAD" | "ALAE" | "MEI" | "ATA";

export interface Team {
  id: number;
  name: string;
  color?: string | null;
  created_at?: string;
  playerCount?: number;
  line_count?: number | null;
  formation?: string | null;
  reserves_count?: number | null;
}

export interface Player {
  id: number;
  name: string;
  position: Position;
  paid: boolean | number; // server returns 0/1 sometimes
  team_id: number | null;
  number?: number | null;
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

export type MatchStatus = "scheduled" | "playing" | "finished";

export type MatchStage =
  | "classificatoria"
  | "oitavas"
  | "quartas"
  | "semi"
  | "final";

export interface Match {
  id: number;
  team_a_id: number;
  team_b_id: number;
  team_a_name?: string;
  team_b_name?: string;
  score_a?: number;
  score_b?: number;
  scheduled_at?: string | null;
  status: MatchStatus;
  stage?: MatchStage;
}

export type EventType = "GOAL" | "YELLOW" | "RED" | "STAR";
export interface MatchEvent {
  id: number;
  match_id: number;
  team_id: number;
  player_id: number;
  type: EventType;
  minute?: number | null;
  player_name?: string;
  created_at?: string;
}
