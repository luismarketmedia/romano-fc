import { MongoClient, Db, Collection, ServerApiVersion } from "mongodb";
import os from "os";

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
  paid: number | boolean; // accept both for compatibility
  team_id: number | null;
  number?: number | null;
  created_at: string;
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
  updated_at: string;
}

export interface Match {
  id: number;
  team_a_id: number;
  team_b_id: number;
  scheduled_at?: string | null;
  status: string;
  stage?: string | null;
  created_at: string;
}

export interface MatchEvent {
  id: number;
  match_id: number;
  team_id: number;
  player_id: number;
  type: "GOAL" | "YELLOW" | "RED" | "STAR";
  minute?: number | null;
  created_at: string;
}

type WithId<T> = T & { _id?: any };

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connecting: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "romano";
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI is missing or invalid");
  }

  connecting = (async () => {
    const insecure = process.env.MONGODB_TLS_INSECURE === "1";
    const baseOptions: any = {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
      serverApi: { version: ServerApiVersion.v1 },
      family: 4,
    };
    if (insecure) {
      baseOptions.tls = true;
      baseOptions.tlsAllowInvalidCertificates = true;
      baseOptions.tlsAllowInvalidHostnames = true;
    }

    const attempts = 3;
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      const client = new MongoClient(uri, baseOptions);
      try {
        await client.connect();
        cachedClient = client;
        const db = client.db(dbName);
        // Ensure indexes (best-effort, don't fail startup)
        try {
          await Promise.all([
            db.collection<WithId<Team>>("teams").createIndex({ id: 1 }, { unique: true }),
            db.collection<WithId<Player>>("players").createIndex({ id: 1 }, { unique: true }),
            db.collection<WithId<Player>>("players").createIndex({ team_id: 1 }),
            db.collection<WithId<Lineup>>("lineups").createIndex({ team_id: 1 }, { unique: true }),
            db.collection<WithId<Match>>("matches").createIndex({ id: 1 }, { unique: true }),
            db.collection<WithId<MatchEvent>>("match_events").createIndex({ id: 1 }, { unique: true }),
            db.collection<WithId<MatchEvent>>("match_events").createIndex({ match_id: 1 }),
          ]);
        } catch (idxErr) {
          console.warn("[DB] Index ensure warning:", idxErr);
        }
        cachedDb = db;
        return db;
      } catch (e: any) {
        lastErr = e;
        try {
          await client.close();
        } catch {}
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }

    console.error("[DB] Connection error:", {
      name: lastErr?.name,
      code: lastErr?.code,
      message: lastErr?.message,
    });
    throw new Error("DATABASE_CONNECTION_FAILED");
  })();

  try {
    const db = await connecting;
    return db;
  } finally {
    connecting = null;
  }
}

export async function col<T = any>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

// Simple numeric id generator similar to SQL autoincrement
export async function getNextId(key: string): Promise<number> {
  const db = await getDb();
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  const doc = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = (doc as any)?.seq ?? 1;
  return Number(seq);
}

export function nowIso(): string {
  return new Date().toISOString();
}
