"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { formatarNota, useConfiguracaoDeDesempenho } from "@/lib/rh/use-desempenho";
import {
  ROTULO_DO_STATUS_DO_PLANO,
  progressoDaMeta,
  useEncerrarPlano,
  usePlanos,
  useRegistrarAcompanhamento,
  type MetaDoPlano,
  type PlanoDeMelhoria,
} from "@/lib/rh/use-parecer";
import { cn } from "@/lib/utils";

import { Campo, ErroDeCarga } from "../campo";

const VARIANTE_DO_STATUS: Record<string, "waiting" | "success" | "overdue" | "outline"> = {
  EmAndamento: "waiting",
  Cumprido: "success",
  NaoCumprido: "overdue",
  Cancelado: "outline",
};

const NOME_PADRAO: Record<string, string> = {
  Avaliacao: "Avaliação",
  Assiduidade: "Assiduidade",
  Pontualidade: "Pontualidade",
  Tarefas: "Tarefas no prazo",
  Demandas: "Demandas",
  Ocorrencias: "Ocorrências",
  Advertencias: "Advertências",
  Reunioes: "Reuniões e atendimentos",
};

/** Nome do componente da nota (a configuração da escola manda; sem ela, a chave). */
function useNomeDoComponente(gestao: boolean) {
  // A funcionária não tem a área que lê a configuração: sem ela, vale o mapa de nomes padrão.
  const { data } = useConfiguracaoDeDesempenho(gestao);
  return (chave: string) => data?.componentes.find((c) => c.chave === chave)?.nome ?? NOME_PADRAO[chave] ?? chave;
}

/**
 * Plano de melhoria: objetivo, prazo, metas com barra de progresso e acompanhamentos. Na ficha (`gestao`) dá para
 * registrar acompanhamento e encerrar; em "Meu desempenho" é só leitura.
 */
export function CartaoDoPlano({ plano, gestao }: { plano: PlanoDeMelhoria; gestao: boolean }) {
  const [dialogo, setDialogo] = useState<"acompanhamento" | "encerrar" | null>(null);
  const emAndamento = plano.status === "EmAndamento";
  const vencido = emAndamento && plano.fim < hojeIsoBrasilia();
  const metas = [...plano.metas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const acompanhamentos = [...plano.acompanhamentos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <article className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant={VARIANTE_DO_STATUS[plano.status] ?? "outline"}>{ROTULO_DO_STATUS_DO_PLANO[plano.status] ?? plano.status}</Badge>
        <span className="font-mono text-[12.5px] tabular-nums text-muted-foreground">
          {formatarSoData(plano.inicio)} a {formatarSoData(plano.fim)}
        </span>
        {vencido && <Badge variant="overdue">Prazo vencido</Badge>}
        {plano.notaNoInicio != null && (
          <span className="text-xs text-muted-foreground">
            Nota no início {formatarNota(plano.notaNoInicio)}
            {plano.notaNoFim != null && ` · no fim ${formatarNota(plano.notaNoFim)}`}
          </span>
        )}
      </div>
      <p className="text-[13px] leading-snug break-words">
        <span className="font-medium">Objetivo:</span> {plano.objetivo}
      </p>

      {metas.length > 0 && (
        <ul className="grid gap-2">
          {metas.map((m) => (
            <Meta key={m.id} meta={m} gestao={gestao} />
          ))}
        </ul>
      )}

      {plano.resultado && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-snug break-words">
          <span className="font-medium">Resultado{plano.encerradoEm ? ` (${formatarSoData(plano.encerradoEm)})` : ""}:</span> {plano.resultado}
        </p>
      )}

      <div className="grid gap-1">
        <p className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">Acompanhamentos</p>
        {acompanhamentos.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nenhum acompanhamento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {acompanhamentos.map((a) => (
              <li key={a.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 py-1.5 text-[13px] leading-snug">
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{formatarSoData(a.data)}</span>
                <span className="break-words">
                  {a.texto}
                  {gestao && a.registradoPorNome && <span className="text-muted-foreground"> · {a.registradoPorNome}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {gestao && emAndamento && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialogo("acompanhamento")}>
            Registrar acompanhamento
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialogo("encerrar")}>
            Encerrar plano
          </Button>
        </div>
      )}

      {dialogo === "acompanhamento" && <DialogAcompanhamento planoId={plano.id} onFechar={() => setDialogo(null)} />}
      {dialogo === "encerrar" && <DialogEncerrar planoId={plano.id} onFechar={() => setDialogo(null)} />}
    </article>
  );
}

function Meta({ meta, gestao }: { meta: MetaDoPlano; gestao: boolean }) {
  const nome = useNomeDoComponente(gestao);
  const progresso = progressoDaMeta(meta);
  const atingida = progresso != null && progresso >= 100;
  return (
    <li className="grid gap-1 text-[13px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 break-words font-medium">{meta.descricao}</span>
        {meta.componente && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {nome(meta.componente)}
            {meta.notaAlvo != null && ` · alvo ${formatarNota(meta.notaAlvo)}`}
            {meta.notaAtual != null && ` · agora ${formatarNota(meta.notaAtual)}`}
          </span>
        )}
        {!meta.componente && meta.notaAlvo != null && <span className="shrink-0 text-xs text-muted-foreground">alvo {formatarNota(meta.notaAlvo)}</span>}
      </div>
      {progresso != null && (
        <div className="flex items-center gap-2">
          <div
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso)}
            aria-label={`Progresso da meta: ${meta.descricao}`}
          >
            <div className={cn("h-full rounded-full", atingida ? "bg-success" : "bg-primary")} style={{ width: `${progresso}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">{Math.round(progresso)}%</span>
        </div>
      )}
    </li>
  );
}

function DialogAcompanhamento({ planoId, onFechar }: { planoId: string; onFechar: () => void }) {
  const registrar = useRegistrarAcompanhamento();
  const [texto, setTexto] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    try {
      await registrar.mutateAsync({ planoId, texto: texto.trim() });
      toast.success("Acompanhamento registrado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o acompanhamento.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !registrar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar acompanhamento</DialogTitle>
          <DialogDescription>
            O que foi conversado ou observado sobre o plano. A pessoa vê este texto em &quot;Meu desempenho&quot;: descreva fatos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-3">
          <Campo id="acomp-texto" rotulo="Acompanhamento">
            <Textarea id="acomp-texto" rows={4} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={registrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={registrar.isPending || !texto.trim()}>
              {registrar.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DESFECHOS = ["Cumprido", "NaoCumprido", "Cancelado"] as const;

function DialogEncerrar({ planoId, onFechar }: { planoId: string; onFechar: () => void }) {
  const encerrar = useEncerrarPlano();
  const [status, setStatus] = useState<string>("Cumprido");
  const [resultado, setResultado] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!resultado.trim()) return;
    try {
      await encerrar.mutateAsync({ planoId, status, resultado: resultado.trim() });
      toast.success("Plano encerrado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível encerrar o plano.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !encerrar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar o plano de melhoria</DialogTitle>
          <DialogDescription>
            O encerramento não se desfaz. Plano &quot;não cumprido&quot; passa a pesar no parecer; a pessoa é avisada do resultado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-3">
          <Campo id="enc-status" rotulo="Como terminou">
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger id="enc-status" className="w-full">
                <SelectValue>{() => ROTULO_DO_STATUS_DO_PLANO[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {DESFECHOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ROTULO_DO_STATUS_DO_PLANO[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="enc-resultado" rotulo="Resultado" dica="O que foi alcançado e o que não foi.">
            <Textarea id="enc-resultado" rows={4} maxLength={2000} value={resultado} onChange={(e) => setResultado(e.target.value)} />
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={encerrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={encerrar.isPending || !resultado.trim()}>
              {encerrar.isPending ? "Encerrando..." : "Encerrar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Seção "Plano de melhoria" da ficha: o em andamento primeiro e, recolhidos, os encerrados. */
export function PainelDoPlano({ funcionarioId }: { funcionarioId: string }) {
  const { data, isLoading, isError, refetch } = usePlanos(funcionarioId);
  const [verAntigos, setVerAntigos] = useState(false);

  const planos = data ?? [];
  const atual = planos.find((p) => p.status === "EmAndamento");
  const antigos = planos.filter((p) => p !== atual);

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4" aria-label="Plano de melhoria">
      <h3 className="font-heading text-base font-semibold">Plano de melhoria</h3>
      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os planos de melhoria." onTentar={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : planos.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Nenhum plano de melhoria até agora.</p>
      ) : (
        <>
          {atual ? (
            <CartaoDoPlano plano={atual} gestao />
          ) : (
            <p className="text-[13px] text-muted-foreground">Nenhum plano em andamento.</p>
          )}
          {antigos.length > 0 && (
            <>
              <button type="button" className="self-start text-xs font-medium text-primary hover:underline" onClick={() => setVerAntigos((v) => !v)}>
                {verAntigos ? "Ocultar planos encerrados" : `Ver planos encerrados (${antigos.length})`}
              </button>
              {verAntigos && antigos.map((p) => <CartaoDoPlano key={p.id} plano={p} gestao />)}
            </>
          )}
        </>
      )}
    </section>
  );
}
