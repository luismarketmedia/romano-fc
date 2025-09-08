import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { listTeams, createTeam, updateTeam, deleteTeam } from "./routes/teams";
import { listPlayers, createPlayer, updatePlayer, deletePlayer } from "./routes/players";
import { drawTeams } from "./routes/draw";
import { getLineup, saveLineup } from "./routes/lineup";
import { listMatches, getMatch, createMatch, updateMatch, addEvent, deleteEvent, generateMatches } from "./routes/matches";
import { seedAndDraw, clearDb } from "./routes/dev";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Teams
  app.get("/api/teams", listTeams);
  app.post("/api/teams", createTeam);
  app.put("/api/teams/:id", updateTeam);
  app.delete("/api/teams/:id", deleteTeam);

  // Players
  app.get("/api/players", listPlayers);
  app.post("/api/players", createPlayer);
  app.put("/api/players/:id", updatePlayer);
  app.delete("/api/players/:id", deletePlayer);

  // Draw
  app.post("/api/draw", drawTeams);

  // Lineup per team
  app.get("/api/teams/:id/lineup", getLineup);
  app.put("/api/teams/:id/lineup", saveLineup);

  // Matches
  app.get("/api/matches", listMatches);
  app.post("/api/matches", createMatch);
  app.post("/api/matches/generate", generateMatches);
  app.get("/api/matches/:id", getMatch);
  app.put("/api/matches/:id", updateMatch);
  app.post("/api/matches/:id/events", addEvent);
  app.delete("/api/matches/:id/events/:eventId", deleteEvent);

  // Dev utilities
  app.post("/api/dev/seed", seedAndDraw);
  app.post("/api/dev/clear", clearDb);

  return app;
}
