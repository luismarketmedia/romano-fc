import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { listTeams, createTeam, updateTeam, deleteTeam } from "./routes/teams";
import { listPlayers, createPlayer, updatePlayer, deletePlayer } from "./routes/players";
import { drawTeams } from "./routes/draw";
import { getLineup, saveLineup } from "./routes/lineup";

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

  return app;
}
