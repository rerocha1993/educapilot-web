"use client";

import { useState } from "react";
import { CalendarSync, ChevronDown, Pencil, Plus, Power, Users } from "lucide-react";
import { toast } from "sonner";

import { DialogAlunosDoPlano, DialogPlano } from "@/components/relacionamento/pagamentos/dialog-plano";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useAlternarPlano,
  useGerarCobrancasDoPlano,
  usePlano,
  usePlanos,
  type Plano,
  type PlanoDetalhe,
  type ResultadoDoPlano,
} from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "outubro de 2026" a partir de "yyyy-MM". */
function nomeDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES[(mes || 1) - 1]} de ${ano}`;
}

function vigencia(p: Plano): string {
  return p.fim ? `${formatarSoData(p.inicio)} a ${formatarSoData(p.fim)}` : `desde ${formatarSoData(p.inicio)}`;
}

type Dialogo =
  | { tipo: "novo" }
  | { tipo: "editar"; plano: Plano }
  | { tipo: "alunos"; plano: PlanoDetalhe }
  | { tipo: "gerar"; plano: PlanoDetalhe }
  | { tipo: "alternar"; plano: Plano };

/** Planos recorrentes: a lista, e em cada plano o detalhe com os alunos e as ações do mês. */
export function AbaPlanos() {
  const { data, isLoading, isError, refetch } = usePlanos();
  const [aberto, setAberto] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-sm text-muted-foreground">
          Cobranças mensais fora da mensalidade, como período integral ou transporte. Cada plano tem os seus alunos e
          gera uma cobrança por mês.
        </p>
        <Button variant="action" onClick={() => setDialogo({ tipo: "novo" })}>
          <Plus />
          Novo plano
        </Button>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os planos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EstadoVazio
          icone={<CalendarSync />}
          titulo="Nenhum plano recorrente"
          texto="Crie um plano para cobrar todo mês o que não está na mensalidade, como o período integral."
          textoClassName="max-w-[380px]"
          acao={
            <Button variant="action" onClick={() => setDialogo({ tipo: "novo" })}>
              <Plus />
              Novo plano
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2">
          {(data ?? []).map((p) => (
            <li key={p.id}>
              <CartaoDoPlano
                plano={p}
                aberto={aberto === p.id}
                onAlternar={() => setAberto((atual) => (atual === p.id ? null : p.id))}
                onDialogo={setDialogo}
              />
            </li>
          ))}
        </ul>
      )}

      {dialogo?.tipo === "novo" && <DialogPlano onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "editar" && <DialogPlano plano={dialogo.plano} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "alunos" && (
        <DialogAlunosDoPlano
          planoId={dialogo.plano.id}
          nome={dialogo.plano.nome}
          inicial={dialogo.plano.alunos.filter((a) => a.ativo).map((a) => a.studentId)}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "gerar" && <DialogGerarDoPlano plano={dialogo.plano} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "alternar" && <AlternarPlano plano={dialogo.plano} onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function CartaoDoPlano({
  plano: p,
  aberto,
  onAlternar,
  onDialogo,
}: {
  plano: Plano;
  aberto: boolean;
  onAlternar: () => void;
  onDialogo: (d: Dialogo) => void;
}) {
  const painel = `plano-${p.id}`;

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={painel}
        onClick={onAlternar}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl p-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium break-words">{p.nome}</span>
            <Badge variant={p.ativo ? "success" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
            {p.gerarCobrancaAsaas && <Badge variant="waiting">Asaas</Badge>}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            <span className="font-mono font-semibold text-foreground tabular-nums">{formatarMoeda(p.valor)}</span> por mês · vence
            dia {p.diaVencimento} · {vigencia(p)} · {p.alunos} {p.alunos === 1 ? "aluno" : "alunos"}
          </span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto && (
        <div id={painel} className="border-t border-border p-3">
          <DetalheDoPlano plano={p} onDialogo={onDialogo} />
        </div>
      )}
    </div>
  );
}

function DetalheDoPlano({ plano: p, onDialogo }: { plano: Plano; onDialogo: (d: Dialogo) => void }) {
  const { data, isLoading, isError, refetch } = usePlano(p.id);

  return (
    <div className="grid gap-3">
      {p.descricao && <p className="text-sm break-words text-muted-foreground">{p.descricao}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onDialogo({ tipo: "editar", plano: p })}>
          <Pencil />
          Editar dados
        </Button>
        <Button variant="outline" size="sm" disabled={!data} onClick={() => data && onDialogo({ tipo: "alunos", plano: data })}>
          <Users />
          Alunos do plano
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDialogo({ tipo: "alternar", plano: p })}>
          <Power />
          {p.ativo ? "Desativar" : "Ativar"}
        </Button>
        <Button
          variant="action"
          size="sm"
          disabled={!data || !p.ativo}
          title={p.ativo ? undefined : "Ative o plano para gerar cobranças"}
          onClick={() => data && onDialogo({ tipo: "gerar", plano: data })}
        >
          <CalendarSync />
          Gerar cobranças do mês
        </Button>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os alunos do plano." onTentar={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (data?.alunos ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
          Nenhum aluno neste plano. Use &quot;Alunos do plano&quot; para escolher quem é cobrado.
        </p>
      ) : (
        <ul aria-label={`Alunos de ${p.nome}`} className="grid gap-0.5 rounded-lg border border-border p-1.5 sm:grid-cols-2">
          {(data?.alunos ?? []).map((a) => (
            <li key={a.studentId} className={cn("flex items-start gap-2 rounded-md px-1.5 py-1.5 text-sm", !a.ativo && "opacity-60")}>
              <span className="min-w-0 flex-1">
                <span className="block break-words">{a.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {[a.turma, a.guardianNome].filter(Boolean).join(" · ") || "Sem responsável financeiro"}
                </span>
              </span>
              {!a.ativo && <span className="shrink-0 text-xs text-muted-foreground">fora do plano</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlternarPlano({ plano: p, onFechar }: { plano: Plano; onFechar: () => void }) {
  const alternar = useAlternarPlano();

  async function confirmar() {
    try {
      await alternar.mutateAsync({ id: p.id, ativar: !p.ativo });
      toast.success(p.ativo ? "Plano desativado." : "Plano ativado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mudar o plano.");
    }
  }

  return (
    <Confirmacao
      titulo={p.ativo ? "Desativar este plano?" : "Ativar este plano?"}
      descricao={
        p.ativo
          ? `"${p.nome}" deixa de gerar cobranças. As que já foram geradas continuam valendo.`
          : `"${p.nome}" volta a poder gerar cobranças mensais.`
      }
      rotuloConfirmar={p.ativo ? "Desativar" : "Ativar"}
      perigosa={p.ativo}
      pendente={alternar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}

/** Pede o mês, confirma quantos alunos entram e mostra o que saiu. */
function DialogGerarDoPlano({ plano: p, onFechar }: { plano: PlanoDetalhe; onFechar: () => void }) {
  const gerar = useGerarCobrancasDoPlano();
  const hoje = hojeIsoBrasilia();
  const { ano: anoAtual, mes: mesAtual } = competenciaDeIso(hoje);
  const [competencia, setCompetencia] = useState(`${anoAtual}-${String(mesAtual).padStart(2, "0")}`);
  const [resultado, setResultado] = useState<ResultadoDoPlano | null>(null);

  const ativos = p.alunos.filter((a) => a.ativo).length;

  async function confirmar() {
    const [ano, mes] = competencia.split("-").map(Number);
    if (!ano || !mes) return void toast.error("Escolha o mês.");
    try {
      setResultado(await gerar.mutateAsync({ id: p.id, ano, mes }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar as cobranças do plano.");
    }
  }

  if (resultado) {
    const ignoradas = Math.max(resultado.totalDeIgnoradas, resultado.ignoradas.length);
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobranças de {nomeDoMes(competencia)}</DialogTitle>
            <DialogDescription>{p.nome}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <ItemDoResultado rotulo="Criadas" valor={resultado.criadas} />
            <ItemDoResultado rotulo="Já existiam" valor={resultado.existentes} />
            <ItemDoResultado rotulo="Ignoradas" valor={ignoradas} />
          </dl>
          {resultado.ignoradas.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Ficaram de fora</p>
              <ul className="grid max-h-60 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 text-sm">
                {resultado.ignoradas.map((i, n) => (
                  <li key={`${i.nome}-${n}`} className="rounded-md px-1.5 py-1">
                    <span className="font-medium">{i.nome}</span>
                    <span className="block text-[13px] text-muted-foreground">{i.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="action" onClick={onFechar}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !gerar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar cobranças de {nomeDoMes(competencia)}</DialogTitle>
          <DialogDescription>
            {ativos} {ativos === 1 ? "aluno ativo" : "alunos ativos"} em {p.nome}, {formatarMoeda(p.valor)} cada
            {ativos > 0 && <>, {formatarMoeda(ativos * p.valor)} no total</>}. Quem já tem a cobrança deste mês não recebe outra.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium">
          Mês
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
        </label>
        <DialogFooter>
          <Button variant="outline" disabled={gerar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={gerar.isPending || ativos === 0 || !competencia} onClick={confirmar}>
            {gerar.isPending ? "Gerando..." : "Gerar cobranças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDoResultado({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2.5">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
