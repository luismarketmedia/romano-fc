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

const POSICOES: Position[] = ["GOL", "DEF", "MEI", "ATA"];

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
        <ThemeBadge />
      </div>
    </header>
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
  const [teamId, setTeamId] = useState<string>(player?.team_id ? String(player.team_id) : "");

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
                  <SelectItem value="">Sem time</SelectItem>
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
              mut.mutate({ name, position, paid, team_id: teamId ? Number(teamId) : null })
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
              <TableCell className="text-right">
                <TeamDialog team={t} />
                <Button variant="destructive" className="ml-2" onClick={() => del.mutate(t.id)}>
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
        </div>
        <DialogFooter className="pt-2">
          <Button onClick={() => mut.mutate({ name, color: color || null })}>Salvar</Button>
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

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Sorteio de Times</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
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
