"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MessageSquareWarning, Pencil, Plus, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData } from "@/lib/format/date";
import {
  formatarNota,
  useCompartilharAvaliacao,
  useComparacao,
  useIniciarAvaliacao,
  useReabrirAvaliacao,
  type AvaliacaoResumo,
  type Ciclo,
} from "@/lib/rh/use-desempenho";

import { Campo } from "../campo";
import { BotaoDeIcone } from "../lista-movel";
import { BarraDeNota } from "./pecas";

/** Gestor × autoavaliação por competência, no ciclo em foco (some se nenhuma das duas foi concluída). */
function Comparacao({ funcionarioId }: { funcionarioId: string }) {
  const { data } = useComparacao(funcionarioId);
  if (!data || (data.notaGestor == null && data.notaAuto == null)) return null;

  const em100 = (n: number | null) => (n == null ? null : ((n - 1) / 4) * 100);

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">Gestor × autoavaliação · {data.cicloNome}</h4>
        <p className="text-xs text-muted-foreground">
          Gestor {data.notaGestor == null ? "—" : formatarNota(em100(data.notaGestor))} · Auto{" "}
          {data.notaAuto == null ? "—" : formatarNota(em100(data.notaAuto))} (0 a 100). A autoavaliação não entra na nota.
        </p>
      </div>
      <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {data.grupos.map((g) => (
          <li key={g.grupo} className="grid gap-0.5 text-[12.5px]">
            <span className="truncate" title={g.grupo}>
              {g.grupo}
            </span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="grid gap-0.5">
                <BarraDeNota nota={em100(g.gestor) ?? 0} alerta={50} className="h-1.5" />
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-chart-2" style={{ width: `${em100(g.auto) ?? 0}%` }} />
                </div>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {g.gestor?.toLocaleString("pt-BR") ?? "—"} / {g.auto?.toLocaleString("pt-BR") ?? "—"}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" /> Gestor
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-chart-2" /> Autoavaliação
        </span>
      </p>
    </div>
  );
}

function DialogReabrir({ avaliacao, onFechar }: { avaliacao: AvaliacaoResumo; onFechar: () => void }) {
  const reabrir = useReabrirAvaliacao();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 5) return setErro("Informe o motivo (ao menos 5 caracteres).");
    try {
      await reabrir.mutateAsync({ id: avaliacao.id, corpo: { motivo: motivo.trim() } });
      toast.success("Feedback reaberto. A reabertura ficou registrada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reabrir.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !reabrir.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir o feedback de {avaliacao.cicloNome}?</DialogTitle>
          <DialogDescription>
            Feedback concluído não se edita. Reabrir deixa registrado quem, quando e por quê, e recolhe o compartilhamento com o
            funcionário até você concluir de novo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-3">
          <Campo id="reabrir-motivo" rotulo="Motivo da reabertura">
            <Textarea id="reabrir-motivo" rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
          </Campo>
          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={reabrir.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={reabrir.isPending}>
              {reabrir.isPending ? "Reabrindo..." : "Reabrir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Histórico de feedbacks do funcionário: ciclo, nota, avaliador e situação, com abrir, compartilhar e reabrir.
 * "Novo feedback" abre (ou retoma) a avaliação do gestor no ciclo aberto.
 */
export function HistoricoDeFeedbacks({
  funcionarioId,
  avaliacoes,
  cicloAberto,
}: {
  funcionarioId: string;
  avaliacoes: AvaliacaoResumo[];
  cicloAberto: Ciclo | null;
}) {
  const router = useRouter();
  const iniciar = useIniciarAvaliacao();
  const compartilhar = useCompartilharAvaliacao();
  const [reabrindo, setReabrindo] = useState<AvaliacaoResumo | null>(null);

  async function novo() {
    try {
      const a = await iniciar.mutateAsync({ funcionarioId });
      router.push(`/rh/desempenho/feedback/${a.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o feedback.");
    }
  }

  async function alternarCompartilhamento(a: AvaliacaoResumo) {
    try {
      await compartilhar.mutateAsync({ id: a.id, corpo: { compartilhar: !a.compartilhada } });
      toast.success(a.compartilhada ? "O funcionário não vê mais este feedback." : "Feedback compartilhado com o funcionário.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o compartilhamento.");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Feedbacks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">Feedbacks</h3>
        {cicloAberto ? (
          <Button size="sm" variant="action" onClick={novo} disabled={iniciar.isPending}>
            <Plus /> {iniciar.isPending ? "Abrindo..." : "Novo feedback"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Sem ciclo aberto. Abra um em Desempenho › Configuração.</p>
        )}
      </div>

      {avaliacoes.length === 0 ? (
        <p className="py-5 text-center text-sm text-muted-foreground">Nenhum feedback ainda.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {avaliacoes.map((a) => {
            const concluida = a.status === "Concluida";
            const doGestor = a.tipo === "Gestor";
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                <span className="min-w-24 font-medium">{a.cicloNome}</span>
                <Badge variant={doGestor ? "secondary" : "outline"}>{doGestor ? "Gestor" : "Autoavaliação"}</Badge>
                <Badge variant={concluida ? "success" : "pending"}>{concluida ? "Concluído" : "Rascunho"}</Badge>
                <span className="font-mono tabular-nums">{concluida ? formatarNota(a.nota100) : "—"}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {a.avaliadorNome ?? ""}
                  {a.concluidaEm && ` · ${formatarSoData(a.concluidaEm)}`}
                </span>
                {a.temContestacao && (
                  <Badge variant="overdue" title="O funcionário registrou contestação ou observação">
                    <MessageSquareWarning /> Contestação
                  </Badge>
                )}
                {doGestor && concluida && (
                  <Badge variant={a.compartilhada ? "success" : "outline"}>{a.compartilhada ? "Compartilhado" : "Não compartilhado"}</Badge>
                )}
                <div className="flex gap-0.5">
                  <BotaoDeIcone
                    rotulo={concluida ? "Ver o feedback" : "Continuar o preenchimento"}
                    icone={concluida ? <Eye /> : <Pencil />}
                    onClick={() => router.push(`/rh/desempenho/feedback/${a.id}`)}
                  />
                  {doGestor && concluida && (
                    <BotaoDeIcone
                      rotulo={a.compartilhada ? "Parar de compartilhar com o funcionário" : "Compartilhar com o funcionário"}
                      icone={a.compartilhada ? <EyeOff /> : <Share2 />}
                      disabled={compartilhar.isPending}
                      onClick={() => alternarCompartilhamento(a)}
                    />
                  )}
                  {concluida && (
                    <BotaoDeIcone rotulo="Reabrir (com motivo)" icone={<RotateCcw />} onClick={() => setReabrindo(a)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Comparacao funcionarioId={funcionarioId} />
      {reabrindo && <DialogReabrir avaliacao={reabrindo} onFechar={() => setReabrindo(null)} />}
    </section>
  );
}
