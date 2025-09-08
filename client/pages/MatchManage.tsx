import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MatchEvent } from "@shared/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

function countBy(events: MatchEvent[], filter: (e: MatchEvent) => boolean) {
  return events.filter(filter).length;
}

export default function MatchManage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const matchId = Number(id);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.getMatch(matchId),
    enabled: Number.isFinite(matchId),
  });

  const add = useMutation({
    mutationFn: (payload: any) => api.addEvent(matchId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });

  const evs: MatchEvent[] = (q.data?.events ?? []) as any;

  const scoreA = useMemo(
    () =>
      countBy(
        evs,
        (e) => e.type === "GOAL" && e.team_id === q.data?.match.team_a_id,
      ),
    [evs, q.data?.match.team_a_id],
  );
  const scoreB = useMemo(
    () =>
      countBy(
        evs,
        (e) => e.type === "GOAL" && e.team_id === q.data?.match.team_b_id,
      ),
    [evs, q.data?.match.team_b_id],
  );

  if (!Number.isFinite(matchId)) {
    return (
      <div className="p-4">
        <div className="text-sm">ID de jogo inválido</div>
        <Button className="mt-3" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          <div className="text-center flex-1">
            <div className="text-xl font-bold">
              {q.data?.match.team_a_name} <span className="px-2">vs</span>{" "}
              {q.data?.match.team_b_name}
            </div>
            <div className="text-3xl font-extrabold mt-1">
              {scoreA} - {scoreB}
            </div>
          </div>
          <div className="w-[88px]" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TeamColumn
            title={q.data?.match.team_a_name ?? ""}
            teamId={q.data?.match.team_a_id}
            players={(q.data?.aPlayers ?? []) as any}
            events={evs}
            onEvent={(playerId, type) =>
              add.mutate({
                team_id: q.data?.match.team_a_id,
                player_id: playerId,
                type,
                minute: null,
              })
            }
          />
          <TeamColumn
            title={q.data?.match.team_b_name ?? ""}
            teamId={q.data?.match.team_b_id}
            players={(q.data?.bPlayers ?? []) as any}
            events={evs}
            onEvent={(playerId, type) =>
              add.mutate({
                team_id: q.data?.match.team_b_id,
                player_id: playerId,
                type,
                minute: null,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  teamId,
  players,
  events,
  onEvent,
}: {
  title: string;
  teamId?: number;
  players: { id: number; name: string }[];
  events: MatchEvent[];
  onEvent: (playerId: number, type: MatchEvent["type"]) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {players.map((p) => {
          const my = events.filter((e) => e.player_id === p.id);
          const g = my.filter((e) => e.type === "GOAL").length;
          const y = my.filter((e) => e.type === "YELLOW").length;
          const r = my.filter((e) => e.type === "RED").length;
          const s = my.filter((e) => e.type === "STAR").length;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <span className="font-medium">{p.name}</span>
              <div className="flex items-center gap-2">
                <BadgeCount label="⭐" count={s} />
                <BadgeCount label="⚽" count={g} />
                <BadgeCount label="🟨" count={y} />
                <BadgeCount label="🟥" count={r} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEvent(p.id, "STAR")}
                >
                  Destaque
                </Button>
                <Button size="sm" onClick={() => onEvent(p.id, "GOAL")}>Gol</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEvent(p.id, "YELLOW")}
                >
                  Amarelo
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onEvent(p.id, "RED")}
                >
                  Vermelho
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BadgeCount({ label, count }: { label: string; count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground">{label}</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
      {label} <span className="ml-1 font-semibold">{count}</span>
    </span>
  );
}
