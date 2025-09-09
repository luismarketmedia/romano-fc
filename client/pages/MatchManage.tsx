import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MatchEvent } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", matchId] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const del = useMutation({
    mutationFn: (eventId: number) => api.deleteEvent(matchId, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", matchId] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
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
        <Button className="mt-3" onClick={() => navigate("/")}>
          Voltar
        </Button>
      </div>
    );
  }

  // Match timer state (20 min per half)
  const halfDurMs = 20 * 60 * 1000;
  const storageKey = Number.isFinite(matchId)
    ? `matchTimer:${matchId}`
    : undefined;
  const [timer, setTimer] = useState<{
    half: 1 | 2;
    isRunning: boolean;
    baseElapsed: number; // accumulated ms in current half when not running
    startedAt: number; // timestamp when started
  }>({ half: 1, isRunning: false, baseElapsed: 0, startedAt: 0 });
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Load persisted timer
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.half === 1 || parsed.half === 2)) {
          setTimer({
            half: parsed.half,
            isRunning: false,
            baseElapsed: Number(parsed.baseElapsed) || 0,
            startedAt: 0,
          });
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist timer
  useEffect(() => {
    if (!storageKey) return;
    const toSave = {
      half: timer.half,
      baseElapsed: timer.isRunning
        ? timer.baseElapsed + (Date.now() - timer.startedAt)
        : timer.baseElapsed,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {}
  }, [timer, storageKey]);

  // Ticker while running
  useEffect(() => {
    if (!timer.isRunning) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.isRunning]);

  const currentElapsed = useMemo(() => {
    return timer.isRunning
      ? Math.max(
          0,
          Math.min(halfDurMs, timer.baseElapsed + (nowMs - timer.startedAt)),
        )
      : Math.max(0, Math.min(halfDurMs, timer.baseElapsed));
  }, [timer.baseElapsed, timer.isRunning, timer.startedAt, nowMs]);

  // Auto-end half at 20:00
  useEffect(() => {
    if (!timer.isRunning) return;
    if (currentElapsed >= halfDurMs) {
      setTimer((t) => ({
        half: (t.half === 1 ? 2 : 2) as 1 | 2,
        isRunning: false,
        baseElapsed: 0,
        startedAt: 0,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentElapsed]);

  const mmss = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const currentMinuteAbs = useMemo(() => {
    const minInHalf = Math.floor(currentElapsed / 60000);
    return Math.min(40, (timer.half - 1) * 20 + minInHalf);
  }, [currentElapsed, timer.half]);

  const toggleRun = () => {
    setTimer((t) => {
      if (t.isRunning) {
        const now = Date.now();
        return {
          ...t,
          isRunning: false,
          baseElapsed: Math.min(halfDurMs, t.baseElapsed + (now - t.startedAt)),
          startedAt: 0,
        };
      }
      return { ...t, isRunning: true, startedAt: Date.now() };
    });
  };

  const endHalf = () => {
    setTimer((t) => ({
      half: (t.half === 1 ? 2 : 2) as 1 | 2,
      isRunning: false,
      baseElapsed: 0,
      startedAt: 0,
    }));
  };

  const setStage = useMutation({
    mutationFn: (stage: any) => api.updateMatch(matchId, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", matchId] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <div className="text-center flex-1 min-w-[240px]">
            <div className="text-xl font-bold">
              {q.data?.match.team_a_name} <span className="px-2">vs</span>{" "}
              {q.data?.match.team_b_name}
            </div>
            <div className="text-3xl font-extrabold mt-1">
              {scoreA} - {scoreB}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                {timer.half}º tempo • 20:00
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {mmss(Math.max(0, halfDurMs - currentElapsed))}
              </div>
            </div>
            <div className="w-40">
              <Select
                value={q.data?.match.stage ?? "classificatoria"}
                onValueChange={(v) => setStage.mutate(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classificatoria">
                    Classificatório
                  </SelectItem>
                  <SelectItem value="oitavas">Oitavas</SelectItem>
                  <SelectItem value="quartas">Quartas</SelectItem>
                  <SelectItem value="semi">Semi</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={toggleRun}>
              {timer.isRunning ? "Pausar" : "Iniciar"}
            </Button>
            <Button
              variant="outline"
              onClick={endHalf}
              disabled={timer.half === 2 && currentElapsed === 0}
            >
              Encerrar tempo
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <TeamColumn
            title={q.data?.match.team_a_name ?? ""}
            teamId={q.data?.match.team_a_id}
            players={(q.data?.aPlayers ?? []) as any}
            events={evs}
            currentStarId={starPlayerId}
            isAdding={add.isPending}
            isNumbering={setNumber.isPending}
            currentMinute={currentMinuteAbs}
            onSetNumber={(playerId, n) =>
              setNumber.mutate({ id: playerId, number: n })
            }
            onDeleteEvent={async (eventId) => del.mutateAsync(eventId)}
            onEvent={(playerId, type) =>
              add.mutate({
                team_id: q.data?.match.team_a_id,
                player_id: playerId,
                type,
                minute: currentMinuteAbs,
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
            isNumbering={setNumber.isPending}
            currentMinute={currentMinuteAbs}
            onSetNumber={(playerId, n) =>
              setNumber.mutate({ id: playerId, number: n })
            }
            onDeleteEvent={async (eventId) => del.mutateAsync(eventId)}
            onEvent={(playerId, type) =>
              add.mutate({
                team_id: q.data?.match.team_b_id,
                player_id: playerId,
                type,
                minute: currentMinuteAbs,
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
  isNumbering: boolean;
  currentMinute?: number;
  onSetNumber: (playerId: number, n: number | null) => void;
  onDeleteEvent: (eventId: number) => Promise<any>;
  onEvent: (playerId: number, type: MatchEvent["type"]) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
          const lastGoalId = (gEvents[g - 1] as any)?.id as number | undefined;
          const lastYellowId = (yEvents[y - 1] as any)?.id as
            | number
            | undefined;
          const lastRedId = (rEvents[r - 1] as any)?.id as number | undefined;
          const isStar = currentStarId === p.id;
          const handleUndo = async (id?: number) => {
            if (!id) return;
            setDeletingId(id);
            try {
              await onDeleteEvent(id);
            } finally {
              setDeletingId((cur) => (cur === id ? null : cur));
            }
          };
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
                  disabled={isNumbering}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      const n = v === "" ? null : Number(v);
                      if (
                        n !== null &&
                        (!Number.isFinite(n) || n < 0 || n > 99)
                      )
                        return;
                      onSetNumber(p.id, n);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? null : Number(v);
                    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 99))
                      return;
                    onSetNumber(p.id, n);
                  }}
                />
                {p.name}
              </span>
              <div className="flex items-center gap-2">
                <StarBadge active={isStar} />
                <BadgeCount
                  label="⚽"
                  count={g}
                  loading={deletingId === lastGoalId}
                  onClick={g ? () => handleUndo(lastGoalId) : undefined}
                />
                <BadgeCount
                  label="🟨"
                  count={y}
                  loading={deletingId === lastYellowId}
                  onClick={y ? () => handleUndo(lastYellowId) : undefined}
                />
                <BadgeCount
                  label="🟥"
                  count={r}
                  loading={deletingId === lastRedId}
                  onClick={r ? () => handleUndo(lastRedId) : undefined}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ações"
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={isAdding}
                      onClick={() => onEvent(p.id, "STAR")}
                    >
                      Destaque
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isAdding}
                      onClick={() => onEvent(p.id, "GOAL")}
                    >
                      Gol
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isAdding}
                      onClick={() => onEvent(p.id, "YELLOW")}
                    >
                      Amarelo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isAdding}
                      onClick={() => onEvent(p.id, "RED")}
                    >
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

function BadgeCount({
  label,
  count,
  loading,
  onClick,
}: {
  label: string;
  count: number;
  loading?: boolean;
  onClick?: () => void;
}) {
  if (!count)
    return <span className="text-xs text-muted-foreground">{label}</span>;
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
  if (!active) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-100">
      ⭐
    </span>
  );
}
