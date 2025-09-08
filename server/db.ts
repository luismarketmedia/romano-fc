import Database from "better-sqlite3";
import path from "path";

// Resolve a database path that works in dev and production builds
const DB_PATH = path.join(process.cwd(), "data.sqlite");

export type Position = "GOL" | "DEF" | "MEI" | "ATA";

export interface Team {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Player {
  id: number;
  name: string;
  position: Position;
  paid: number; // 0/1 in DB
  team_id: number | null;
  created_at: string;
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position in ('GOL','DEF','MEI','ATA')),
  paid INTEGER NOT NULL DEFAULT 0,
  team_id INTEGER NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
`);

export function toBool(n: number): boolean {
  return !!n;
}
