import initSqlJs, { Database as SqlDatabase } from "sql.js";
import fs from "fs";
import path from "path";

export type Position = "GOL" | "DEF" | "ALAD" | "ALAE" | "MEI" | "ATA";
export interface Team {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
  line_count?: number | null;
  formation?: string | null;
  reserves_count?: number | null;
}
export interface Player {
  id: number;
  name: string;
  position: Position;
  paid: number;
  team_id: number | null;
  created_at: string;
}

const DB_PATH = path.join(process.cwd(), "data.sqlite");
let dbPromise: Promise<SqlDatabase> | null = null;

async function init(): Promise<SqlDatabase> {
  const SQL = await initSqlJs({
    locateFile: (f) => `node_modules/sql.js/dist/${f}`,
  });
  let db: SqlDatabase;
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(filebuffer));
  } else {
    db = new SQL.Database();
  }
  migrate(db);
  persist(db);
  return db;
}

export async function getDb(): Promise<SqlDatabase> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

export function persist(db: SqlDatabase) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function migrate(db: SqlDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL CHECK (position in ('GOL','DEF','ALAD','ALAE','MEI','ATA')),
      paid INTEGER NOT NULL DEFAULT 0,
      team_id INTEGER NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS lineups (
      team_id INTEGER PRIMARY KEY,
      goleiro INTEGER NULL,
      ala_direito INTEGER NULL,
      ala_esquerdo INTEGER NULL,
      frente INTEGER NULL,
      zag INTEGER NULL,
      meio INTEGER NULL,
      reserva1 INTEGER NULL,
      reserva2 INTEGER NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
    CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_a_id INTEGER NOT NULL,
      team_b_id INTEGER NOT NULL,
      scheduled_at TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(team_a_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(team_b_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS match_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type in ('GOAL','YELLOW','RED','STAR')),
      minute INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id);
  `);

  // Schema upgrades: add new team columns if missing
  const cols = db.exec("PRAGMA table_info('teams')");
  const teamColNames = new Set<string>(
    (cols?.[0]?.values ?? []).map((r: any[]) => String(r[1])),
  );
  if (!teamColNames.has("line_count"))
    db.run("ALTER TABLE teams ADD COLUMN line_count INTEGER");
  if (!teamColNames.has("formation"))
    db.run("ALTER TABLE teams ADD COLUMN formation TEXT");
  if (!teamColNames.has("reserves_count"))
    db.run("ALTER TABLE teams ADD COLUMN reserves_count INTEGER");

  // Rebuild players table to allow ALAD/ALAE if old schema detected
  const master = db.exec(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='players'",
  );
  const createSql: string = master?.[0]?.values?.[0]?.[0] || "";
  if (createSql && !createSql.includes("ALAD")) {
    db.run("ALTER TABLE players RENAME TO players_old");
    db.run(`CREATE TABLE players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL CHECK (position in ('GOL','DEF','ALAD','ALAE','MEI','ATA')),
      paid INTEGER NOT NULL DEFAULT 0,
      team_id INTEGER NULL,
      number INTEGER NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE SET NULL
    )`);
    db.run(
      "INSERT INTO players (id,name,position,paid,team_id,number,created_at) SELECT id,name,position,paid,team_id,NULL as number,created_at FROM players_old",
    );
    db.run("DROP TABLE players_old");
    db.run("CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)");
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)",
    );
  }

  // Add number column if missing (for existing correct schema)
  const pcols = db.exec("PRAGMA table_info('players')");
  const pcolNames = new Set<string>((pcols?.[0]?.values ?? []).map((r: any[]) => String(r[1])));
  if (!pcolNames.has("number")) {
    db.run("ALTER TABLE players ADD COLUMN number INTEGER NULL");
  }

  // Rebuild match_events to support STAR type if old schema detected
  const meMaster = db.exec(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='match_events'",
  );
  const meCreateSql: string = meMaster?.[0]?.values?.[0]?.[0] || "";
  if (meCreateSql && !meCreateSql.includes("'STAR'")) {
    db.run("ALTER TABLE match_events RENAME TO match_events_old");
    db.run(`CREATE TABLE match_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type in ('GOAL','YELLOW','RED','STAR')),
      minute INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    )`);
    db.run(
      "INSERT INTO match_events (id, match_id, team_id, player_id, type, minute, created_at) SELECT id, match_id, team_id, player_id, type, minute, created_at FROM match_events_old",
    );
    db.run("DROP TABLE match_events_old");
    db.run("CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id)");
  }
}

export async function all<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows as T[];
}

export async function get<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
  persist(db);
}

export async function insert(sql: string, params: any[] = []): Promise<number> {
  const db = await getDb();
  db.run(sql, params);
  const idRow = db.exec("SELECT last_insert_rowid() as id");
  persist(db);
  const id = idRow?.[0]?.values?.[0]?.[0];
  return Number(id);
}
