import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Player, Team, Position, DrawResponse } from "@shared/api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LOGO = "https://cdn.builder.io/api/v1/image/assets%2Fdd0e0d13e89c41f6bd8d2f066e57bed0%2Fbe6eb874bc804d4aa984b5ff83177460?format=webp&width=300";

const POSICOES: Position[] = ["GOL", "DEF", "ALAD", "ALAE", "MEI", "ATA"];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <Dashboard />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Romano EC" className="h-10 w-10 rounded-md shadow-sm" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Romano Esporte Clube</h1>
            <p className="text-xs text-muted-foreground">Mini dashboard • Times • Pessoas • Sorteios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DevSeedButton />
          <DevClearButton />
          <ThemeBadge />
        </div>
      </div>
    </header>
  );
}

function DevSeedButton() {
  if (!import.meta.env.DEV) return null;
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.devSeed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
  return (
    <Button variant="outline" onClick={() => mut.mutate()} disabled={mut.isPending}>
      {mut.isPending ? "Carregando..." : "Dados de teste"}
    </Button>
  );
}

function DevClearButton() {
  if (!import.meta.env.DEV) return null;
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.devClear(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
  return (
    <Button variant="destructive" onClick={() => mut.mutate()} disabled={mut.isPending}>
      {mut.isPending ? "Limpando..." : "Limpar base"}
    </Button>
  );
}

function ThemeBadge() {
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-primary-foreground text-xs font-semibold shadow">
      <span>Marca Romano</span>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const playersQ = useQuery({ queryKey: ["players"], queryFn: api.listPlayers });

  const totalPaid = useMemo(
    () => (playersQ.data ?? []).filter((p) => (typeof p.paid === "number" ? p.paid === 1 : p.paid)).length,
    [playersQ.data],
  );

  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Times" value={teamsQ.data?.length ?? 0} />
        <StatCard title="Jogadores" value={playersQ.data?.length ?? 0} />
        <StatCard title="Pagos" value={totalPaid} />
      </div>

      <Tabs defaultValue="pessoas" className="mt-6">
        <TabsList>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="times">Times</TabsTrigger>
          <TabsTrigger value="sorteio">Sorteio</TabsTrigger>
          <TabsTrigger value="jogos">Jogos</TabsTrigger>
        </TabsList>
        <TabsContent value="pessoas" className="pt-4">
          <PessoasTable />
        </TabsContent>
        <TabsContent value="times" className="pt-4">
          <TimesTable />
        </TabsContent>
        <TabsContent value="sorteio" className="pt-4">
          <Sorteio />
        </TabsContent>
        <TabsContent value="jogos" className="pt-4">
          <Jogos />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function PessoasTable() {
  const qc = useQueryClient();
  const playersQ = useQuery({ queryKey: ["players"], queryFn: api.listPlayers });
  const del = useMutation({
    mutationFn: (id: number) => api.deletePlayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-lg font-semibold">Pessoas</h2>
        <PlayerDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Posição</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(playersQ.data ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.position}</TableCell>
              <TableCell>
                {(typeof p.paid === "number" ? p.paid === 1 : p.paid) ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">Sim</span>
                ) : (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">Não</span>
                )}
              </TableCell>
              <TableCell>{p.team_name ?? "—"}</TableCell>
              <TableCell className="text-right">
                <PlayerDialog player={p} />
                <Button variant="destructive" className="ml-2" onClick={() => del.mutate(p.id)}>
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlayerDialog({ player }: { player?: Player }) {
  const qc = useQueryClient();
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: async (data: Partial<Player>) => {
      if (player) return api.updatePlayer(player.id, data);
      return api.createPlayer(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      setOpen(false);
    },
  });

  const [name, setName] = useState(player?.name ?? "");
  const [position, setPosition] = useState<Position>(player?.position ?? "MEI");
  const [paid, setPaid] = useState<boolean>(typeof player?.paid === "number" ? player!.paid === 1 : !!player?.paid);
  const [teamId, setTeamId] = useState<string>(player?.team_id ? String(player.team_id) : "none");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {player ? (
          <Button variant="outline">Editar</Button>
        ) : (
          <Button>Novo Jogador</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{player ? "Editar Jogador" : "Novo Jogador"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="mb-1 block text-sm">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm">Posição</label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {POSICOES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Pago</label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Checkbox checked={paid} onCheckedChange={(v) => setPaid(Boolean(v))} id="paid" />
                <label htmlFor="paid" className="text-sm">
                  Pago
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm">Time</label>
              <Select value={teamId} onValueChange={(v) => setTeamId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem time</SelectItem>
                  {(teams.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            onClick={() =>
              mut.mutate({ name, position, paid, team_id: teamId === "none" ? null : Number(teamId) })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimesTable() {
  const qc = useQueryClient();
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const del = useMutation({
    mutationFn: (id: number) => api.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-lg font-semibold">Times</h2>
        <TeamDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead>Jogadores</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(teamsQ.data ?? []).map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                {t.color ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded" style={{ background: t.color }} />
                    {t.color}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{t.playerCount ?? "—"}</TableCell>
              <TableCell className="text-right space-x-2">
                <TeamDialog team={t} />
                <EscalacaoDialog team={t} />
                <Button variant="destructive" onClick={() => del.mutate(t.id)}>
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamDialog({ team }: { team?: Team }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team?.name ?? "");
  const [color, setColor] = useState(team?.color ?? "");
  const [lineCount, setLineCount] = useState<string>(team?.line_count != null ? String(team.line_count) : "");
  const [formation, setFormation] = useState(team?.formation ?? "");
  const [reservesCount, setReservesCount] = useState<string>(team?.reserves_count != null ? String(team.reserves_count) : "");

  const mut = useMutation({
    mutationFn: async (data: Partial<Team>) => {
      if (team) return api.updateTeam(team.id, data);
      return api.createTeam(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {team ? <Button variant="outline">Editar</Button> : <Button>Novo Time</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Editar Time" : "Novo Time"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="mb-1 block text-sm">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Cor (opcional)</label>
            <Input value={color ?? ""} onChange={(e) => setColor(e.target.value)} placeholder="#ff6600 ou orange" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm">Qtd linha</label>
              <Input value={lineCount} onChange={(e) => setLineCount(e.target.value)} placeholder="ex: 5" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Formação</label>
              <Input value={formation} onChange={(e) => setFormation(e.target.value)} placeholder="ex: 1-2-1-1" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Reservas</label>
              <Input value={reservesCount} onChange={(e) => setReservesCount(e.target.value)} placeholder="ex: 2" />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button onClick={() => mut.mutate({ name, color: color || null, line_count: lineCount ? Number(lineCount) : null, formation: formation || null, reserves_count: reservesCount ? Number(reservesCount) : null })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EscalacaoDialog({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["lineup", team.id],
    queryFn: () => api.getLineup(team.id),
    enabled: open,
  });
  const players = (data?.players ?? []) as { id: number; name: string }[];
  const initial = data?.lineup ?? { team_id: team.id };
  const [form, setForm] = useState<any>(initial);

  const mutate = useMutation({
    mutationFn: (payload: any) => api.saveLineup(team.id, payload),
    onSuccess: () => setOpen(false),
  });

  const role = (key: string, label: string) => (
    <div>
      <label className="mb-1 block text-sm">{label}</label>
      <Select value={String(form?.[key] ?? "none")} onValueChange={(v) => setForm({ ...form, [key]: v === "none" ? null : Number(v) })}>
        <SelectTrigger>
          <SelectValue placeholder="Escolha jogador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {players.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm(initial); }}>
      <DialogTrigger asChild>
        <Button variant="secondary">Escalação</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalação — {team.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
          {role("goleiro", "Goleiro")}
          {role("ala_direito", "Ala direito")}
          {role("ala_esquerdo", "Ala esquerdo")}
          {role("frente", "Frente")}
          {role("zag", "Zagueiro")}
          {role("meio", "Meio")}
          {role("reserva1", "Reserva 1")}
          {role("reserva2", "Reserva 2")}
        </div>
        <DialogFooter className="pt-2">
          <Button onClick={() => mutate.mutate(form)}>Salvar escalação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Sorteio() {
  const [teamCount, setTeamCount] = useState<number>(2);
  const [paidOnly, setPaidOnly] = useState<boolean>(true);
  const [apply, setApply] = useState<boolean>(false);
  const [result, setResult] = useState<DrawResponse | null>(null);

  const run = async () => {
    const r = await api.drawTeams({ teamCount, paidOnly, apply });
    setResult(r);
  };

  const gerarJogos = async () => {
    // Pair teams in order using DB team ids by name
    const teams = await api.listTeams();
    const ids: number[] = [];
    (result?.teams ?? []).forEach((t) => {
      const match = teams.find((dbt) => dbt.name === t.name);
      if (match) ids.push(match.id);
    });
    if (ids.length < 2) return;
    await api.generateMatches(ids);
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Sorteio de Times</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm">Qtd de times</label>
          <Input type="number" min={2} value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} />
        </div>
        <div className="flex items-end gap-2">
          <Checkbox id="paidOnly" checked={paidOnly} onCheckedChange={(v) => setPaidOnly(Boolean(v))} />
          <label htmlFor="paidOnly" className="text-sm">Somente pagos</label>
        </div>
        <div className="flex items-end gap-2">
          <Checkbox id="apply" checked={apply} onCheckedChange={(v) => setApply(Boolean(v))} />
          <label htmlFor="apply" className="text-sm">Aplicar no banco</label>
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={run}>Sortear</Button>
        </div>
        <div className="flex items-end">
          <Button className="w-full" disabled={!result || !apply} onClick={gerarJogos}>Gerar jogos</Button>
        </div>
      </div>

      {result && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.teams.map((t) => (
            <div key={t.name} className="rounded-lg border p-3">
              <div className="mb-2 font-semibold">{t.name}</div>
              <ul className="space-y-1 text-sm">
                {t.players.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.position}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Jogos() {
  const qc = useQueryClient();
  const matchesQ = useQuery({ queryKey: ["matches"], queryFn: api.listMatches });
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-lg font-semibold">Jogos</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partida</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Placar</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(matchesQ.data ?? []).map((m: any) => (
            <TableRow key={m.id}>
              <TableCell>{m.team_a_name} vs {m.team_b_name}</TableCell>
              <TableCell className="uppercase text-xs text-muted-foreground">{m.status}</TableCell>
              <TableCell>{m.score_a} - {m.score_b}</TableCell>
              <TableCell className="text-right">
                <MatchDialog matchId={m.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MatchDialog({ matchId }: { matchId: number }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({ queryKey: ["match", matchId], queryFn: () => api.getMatch(matchId), enabled: open });
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (payload: any) => api.addEvent(matchId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
  const del = useMutation({
    mutationFn: (id: number) => api.deleteEvent(matchId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });

  const [team, setTeam] = useState<string>("");
  const [player, setPlayer] = useState<string>("");
  const [type, setType] = useState<string>("GOAL");
  const [minute, setMinute] = useState<string>("");

  const players = team === "A" ? (detail.data?.aPlayers ?? []) : team === "B" ? (detail.data?.bPlayers ?? []) : [];
  const teamId = team === "A" ? detail.data?.match.team_a_id : team === "B" ? detail.data?.match.team_b_id : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Gerenciar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {detail.data?.match.team_a_name} {" "}
            <span className="px-2">vs</span>
            {detail.data?.match.team_b_name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 pt-2">
          <div>
            <label className="mb-1 block text-sm">Time</label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">{detail.data?.match.team_a_name}</SelectItem>
                <SelectItem value="B">{detail.data?.match.team_b_name}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Jogador</label>
            <Select value={player} onValueChange={setPlayer}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>
                {players.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Evento</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOAL">Gol</SelectItem>
                <SelectItem value="YELLOW">Amarelo</SelectItem>
                <SelectItem value="RED">Vermelho</SelectItem>
                <SelectItem value="STAR">Destaque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Minuto</label>
            <Input value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="ex: 12" />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!teamId || !player}
              onClick={() => add.mutate({ team_id: teamId, player_id: Number(player), type, minute: minute ? Number(minute) : null })}
            >
              Adicionar evento
            </Button>
          </div>
        </div>

        <div className="pt-4">
          <div className="font-semibold mb-2">Eventos</div>
          <ul className="space-y-2 max-h-60 overflow-auto">
            {(detail.data?.events ?? []).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>
                  {e.type === 'GOAL' ? 'Gol' : e.type === 'YELLOW' ? 'Amarelo' : 'Vermelho'} — {e.player_name} {e.minute ? `(${e.minute}m)` : ''}
                </span>
                <Button variant="destructive" onClick={() => del.mutate(e.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
