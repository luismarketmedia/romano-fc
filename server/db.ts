import { MongoClient, Db, Collection } from "mongodb";
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

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "romano";

if (!URI) {
  // In dev or CI environments, make it explicit if missing
  console.warn(
    "MONGODB_URI is not set. Please configure it via environment variables.",
  );
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    if (!URI) throw new Error("Missing MONGODB_URI");
    cachedClient = new MongoClient(URI, {
      serverSelectionTimeoutMS: 10000,
    });
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(DB_NAME);

  // Ensure indexes (best-effort)
  await Promise.all([
    cachedDb.collection<WithId<Team>>("teams").createIndex({ id: 1 }, { unique: true }),
    cachedDb.collection<WithId<Player>>("players").createIndex({ id: 1 }, { unique: true }),
    cachedDb.collection<WithId<Player>>("players").createIndex({ team_id: 1 }),
    cachedDb.collection<WithId<Lineup>>("lineups").createIndex({ team_id: 1 }, { unique: true }),
    cachedDb.collection<WithId<Match>>("matches").createIndex({ id: 1 }, { unique: true }),
    cachedDb.collection<WithId<MatchEvent>>("match_events").createIndex({ id: 1 }, { unique: true }),
    cachedDb.collection<WithId<MatchEvent>>("match_events").createIndex({ match_id: 1 }),
  ]);

  return cachedDb;
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
