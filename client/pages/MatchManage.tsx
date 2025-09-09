import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MatchEvent } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2 } from "lucide-react";

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

  const del = useMutation({
    mutationFn: (eventId: number) => api.deleteEvent(matchId, eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });

  const setNumber = useMutation({
    mutationFn: ({ id, number }: { id: number; number: number | null }) =>
      api.updatePlayer(id, { number }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });

  const evs: MatchEvent[] = (q.data?.events ?? []) as any;
  const starPlayerId = useMemo(() => {
    const s = evs.find((e) => e.type === "STAR");
    return s?.player_id as number | undefined;
  }, [evs]);

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

        <div className="mt-6 grid grid-cols-2 gap-4">
          <TeamColumn
            title={q.data?.match.team_a_name ?? ""}
            teamId={q.data?.match.team_a_id}
            players={(q.data?.aPlayers ?? []) as any}
            events={evs}
            currentStarId={starPlayerId}
            isAdding={add.isPending}
            isDeleting={del.isPending}
            isNumbering={setNumber.isPending}
            onSetNumber={(playerId, n) => setNumber.mutate({ id: playerId, number: n })}
            onDeleteEvent={(eventId) => del.mutate(eventId)}
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
            currentStarId={starPlayerId}
            isAdding={add.isPending}
            isDeleting={del.isPending}
            isNumbering={setNumber.isPending}
            onSetNumber={(playerId, n) => setNumber.mutate({ id: playerId, number: n })}
            onDeleteEvent={(eventId) => del.mutate(eventId)}
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
  currentStarId,
  isAdding,
  isDeleting,
  isNumbering,
  onSetNumber,
  onDeleteEvent,
  onEvent,
}: {
  title: string;
  teamId?: number;
  players: { id: number; name: string; number?: number | null }[];
  events: MatchEvent[];
  currentStarId?: number;
  isAdding: boolean;
  isDeleting: boolean;
  isNumbering: boolean;
  onSetNumber: (playerId: number, n: number | null) => void;
  onDeleteEvent: (eventId: number) => void;
  onEvent: (playerId: number, type: MatchEvent["type"]) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {players.map((p) => {
          const my = events.filter((e) => e.player_id === p.id);
          const gEvents = my.filter((e) => e.type === "GOAL");
          const yEvents = my.filter((e) => e.type === "YELLOW");
          const rEvents = my.filter((e) => e.type === "RED");
          const g = gEvents.length;
          const y = yEvents.length;
          const r = rEvents.length;
          const isStar = currentStarId === p.id;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <span className="font-medium flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={p.number ?? ""}
                  placeholder="#"
                  className="w-14 h-8 px-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      const n = v === "" ? null : Number(v);
                      if (n !== null && (!Number.isFinite(n) || n < 0 || n > 99)) return;
                      onSetNumber(p.id, n);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? null : Number(v);
                    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 99)) return;
                    onSetNumber(p.id, n);
                  }}
                />
                {p.name}
              </span>
              <div className="flex items-center gap-2">
                <StarBadge active={isStar} />
                <BadgeCount label="⚽" count={g} loading={isDeleting} onClick={!isDeleting && g ? () => onDeleteEvent((gEvents[g - 1] as any).id) : undefined} />
                <BadgeCount label="🟨" count={y} loading={isDeleting} onClick={!isDeleting && y ? () => onDeleteEvent((yEvents[y - 1] as any).id) : undefined} />
                <BadgeCount label="🟥" count={r} loading={isDeleting} onClick={!isDeleting && r ? () => onDeleteEvent((rEvents[r - 1] as any).id) : undefined} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações" disabled={isAdding}>
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={isAdding} onClick={() => onEvent(p.id, "STAR")}>
                      Destaque
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isAdding} onClick={() => onEvent(p.id, "GOAL")}>
                      Gol
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isAdding} onClick={() => onEvent(p.id, "YELLOW")}>
                      Amarelo
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isAdding} onClick={() => onEvent(p.id, "RED")}>
                      Vermelho
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BadgeCount({ label, count, loading, onClick }: { label: string; count: number; loading?: boolean; onClick?: () => void }) {
  if (!count) return <span className="text-xs text-muted-foreground">{label}</span>;
  const Cmp: any = onClick ? "button" : "span";
  return (
    <Cmp
      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
      onClick={onClick}
      disabled={!!loading}
    >
      {loading ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <>{label}</>
      )}
      <span className="ml-1 font-semibold">{count}</span>
    </Cmp>
  );
}

function StarBadge({ active }: { active: boolean }) {
  if (!active)
    return null;
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-100">
      ⭐
    </span>
  );
}
