"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarRange, ChevronDown, Plus, Save } from "lucide-react";

import { Campo, CampoSelect, CLASSE_DO_CONTROLE, anoAtual } from "@/components/notas/campos";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAnosLetivos,
  useSalvarAnoLetivo,
  useSalvarPeriodos,
  type AnoLetivo,
  type DivisaoDoAno,
} from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

const DIVISOES: { valor: DivisaoDoAno; rotulo: string }[] = [
  { valor: "Bimestre", rotulo: "Bimestres (4 períodos)" },
  { valor: "Trimestre", rotulo: "Trimestres (3 períodos)" },
  { valor: "Semestre", rotulo: "Semestres (2 períodos)" },
];

/** Anos letivos e seus períodos: o ano nasce com os períodos em datas sugeridas (fevereiro a dezembro), editáveis. */
export function AnosLetivosPainel() {
  const { data: anos, isLoading, isError, error, refetch } = useAnosLetivos();
  const salvar = useSalvarAnoLetivo();

  const [novoAno, setNovoAno] = useState(String(anoAtual()));
  const [divisao, setDivisao] = useState<DivisaoDoAno>("Bimestre");
  const [aberto, setAberto] = useState<string | null>(null);

  const anoValido = /^\d{4}$/.test(novoAno) && Number(novoAno) >= 2000 && Number(novoAno) <= 2100;

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoValido) return;
    try {
      const criado = await salvar.mutateAsync({ entrada: { ano: Number(novoAno), divisao, ativo: (anos ?? []).length === 0 } });
      toast.success(`Ano letivo ${novoAno} criado com os períodos sugeridos. Confira as datas.`);
      setAberto(criado?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar o ano letivo.");
    }
  }

  async function alternarAtivo(ano: AnoLetivo, ativo: boolean) {
    try {
      await salvar.mutateAsync({ id: ano.id, entrada: { ano: ano.ano, divisao: ano.divisao, ativo } });
      toast.success(ativo ? `${ano.ano} é o ano em andamento.` : `${ano.ano} foi desativado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form onSubmit={handleCriar} className="grid items-end gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
        <Campo rotulo="Ano">
          <Input inputMode="numeric" maxLength={4} value={novoAno} onChange={(e) => setNovoAno(e.target.value)} aria-invalid={!anoValido || undefined} />
        </Campo>
        <CampoSelect rotulo="Divisão do ano" value={divisao} onChange={(v) => setDivisao(v as DivisaoDoAno)} opcoes={DIVISOES} />
        <Button type="submit" disabled={!anoValido || salvar.isPending}>
          <Plus className="size-4" />
          Criar ano letivo
        </Button>
      </form>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      )}
      {isError && <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar os anos letivos."} onTentar={() => void refetch()} />}

      {!isLoading && !isError && (anos ?? []).length === 0 && (
        <EstadoVazio icone={<CalendarRange />} titulo="Nenhum ano letivo ainda" texto="Crie o ano acima. Os períodos nascem juntos, divididos em partes iguais de fevereiro a dezembro." />
      )}

      <ul className="flex flex-col gap-2">
        {(anos ?? []).map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setAberto(aberto === a.id ? null : a.id)}
                aria-expanded={aberto === a.id}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDown className={cn("size-4 shrink-0 transition-transform", aberto !== a.id && "-rotate-90")} />
                <span className="font-heading text-[15px] font-semibold">{a.ano}</span>
                <Badge variant="outline">{a.divisao === "Bimestre" ? "Bimestres" : a.divisao === "Trimestre" ? "Trimestres" : "Semestres"}</Badge>
                {a.ativo && <Badge variant="success">Em andamento</Badge>}
              </button>
              <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                Em andamento
                <Switch checked={a.ativo} onCheckedChange={(v) => void alternarAtivo(a, v)} aria-label={`Marcar ${a.ano} como o ano em andamento`} />
              </label>
            </div>
            {aberto === a.id && <PeriodosDoAno ano={a} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PeriodosDoAno({ ano }: { ano: AnoLetivo }) {
  const salvar = useSalvarPeriodos();
  const [edicoes, setEdicoes] = useState<Record<string, { nome?: string; inicio?: string; fim?: string }>>({});
  const sujo = Object.keys(edicoes).length > 0;

  const linhas = ano.periodos.map((p) => ({ ...p, ...edicoes[p.id] }));
  const problemas = linhas.some((p) => !p.nome.trim() || !p.inicio || !p.fim || p.inicio > p.fim);

  function mudar(id: string, campo: "nome" | "inicio" | "fim", valor: string) {
    setEdicoes((atual) => ({ ...atual, [id]: { ...atual[id], [campo]: valor } }));
  }

  async function handleSalvar() {
    try {
      await salvar.mutateAsync({ anoId: ano.id, periodos: linhas.map((p) => ({ id: p.id, nome: p.nome.trim(), inicio: p.inicio, fim: p.fim })) });
      setEdicoes({});
      toast.success("Períodos salvos.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar os períodos.");
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
      <ul className="flex flex-col gap-2">
        {linhas.map((p) => (
          <li key={p.id} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Campo rotulo={`Período ${p.numero}`}>
              <Input value={p.nome} maxLength={60} onChange={(e) => mudar(p.id, "nome", e.target.value)} />
            </Campo>
            <Campo rotulo="Início">
              <input type="date" value={p.inicio} onChange={(e) => mudar(p.id, "inicio", e.target.value)} className={CLASSE_DO_CONTROLE} />
            </Campo>
            <Campo rotulo="Fim">
              <input type="date" value={p.fim} onChange={(e) => mudar(p.id, "fim", e.target.value)} className={CLASSE_DO_CONTROLE} aria-invalid={p.inicio > p.fim || undefined} />
            </Campo>
          </li>
        ))}
      </ul>
      {problemas && <p className="text-[12.5px] text-destructive">Preencha nome, início e fim; o início não pode ser depois do fim.</p>}
      <div className="flex justify-end">
        <Button disabled={!sujo || problemas || salvar.isPending} onClick={handleSalvar}>
          <Save className="size-4" />
          {salvar.isPending ? "Salvando..." : "Salvar períodos"}
        </Button>
      </div>
    </div>
  );
}
