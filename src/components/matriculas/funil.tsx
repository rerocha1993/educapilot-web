"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { QuadroDoFunil } from "@/components/matriculas/quadro-do-funil";
import { Esteira } from "@/components/matriculas/esteira";
import { FolhaDePerda } from "@/components/matriculas/folha-de-perda";
import { PainelDoLead } from "@/components/matriculas/painel-do-lead";
import { FormularioDoLead } from "@/components/matriculas/formulario-do-lead";
import { cn } from "@/lib/utils";
import type { EtapaDoFunil, LeadDetalhe, LeadResumo, Quadro } from "@/lib/matriculas/tipos";
import { ETAPAS_FINAIS, TITULO_PADRAO_DA_ETAPA, esperaEmTexto } from "@/lib/matriculas/rotulos";
import { useMoverLead, useQuadro } from "@/lib/matriculas/use-funil";

function useBuscaAtrasada(valor: string, ms = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/** O funil inteiro: números, faixa de espera, quadro, ficha e formulários. */
export function Funil() {
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useBuscaAtrasada(busca);
  const { data: quadro, isLoading, isError, dataUpdatedAt } = useQuadro(buscaAtrasada);
  const mover = useMoverLead();

  const [arrastando, setArrastando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [perdendo, setPerdendo] = useState<LeadResumo | null>(null);
  const [formulario, setFormulario] = useState<{ lead?: LeadDetalhe | null } | null>(null);

  // Um "agora" por leitura do quadro: todos os cards dizem "há X" contando do mesmo instante.
  const agora = dataUpdatedAt || Date.now();
  const titulos = useMemo(
    () => Object.fromEntries((quadro?.etapas ?? []).map((e) => [e.etapa, e.titulo])) as Partial<Record<EtapaDoFunil, string>>,
    [quadro]
  );

  function pedirMudanca(lead: LeadResumo, para: EtapaDoFunil) {
    // Perdido pede o motivo antes: o card só sai da coluna quando a equipe disser por quê.
    if (para === "Perdido") {
      setPerdendo(lead);
      return;
    }
    executarMudanca(lead, para);
  }

  async function executarMudanca(lead: LeadResumo, para: EtapaDoFunil, motivoPerda?: string) {
    try {
      await mover.mutateAsync({ id: lead.id, etapa: para, motivoPerda });
      const nome = lead.nomeResponsavel.split(" ")[0];
      const destino = titulos[para] ?? TITULO_PADRAO_DA_ETAPA[para];
      toast.success(`${nome} agora em ${destino}`, {
        description:
          para === "Visitou"
            ? "3 contatos agendados: 24 horas, 3 dias e 7 dias depois da visita."
            : para === "Reagendar"
              ? "A visita antiga saiu da agenda da família."
              : undefined,
      });
      setPerdendo(null);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível mover a família.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex flex-col gap-4 transition-[filter,opacity] duration-300", arrastando && "opacity-50 blur-[2px]")}>
        <MatriculasNav />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
            <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
              Funil de famílias
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Arraste o card para mudar a família de etapa. Clique para abrir a ficha.
            </p>
          </div>
          <div className="flex gap-2">
            <label className="flex h-9 flex-1 items-center gap-2 rounded-full border border-input bg-card px-3.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 md:w-72 md:flex-none">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                id="busca-funil"
                aria-label="Buscar família"
                placeholder="Família, criança ou telefone"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </label>
            <Button variant="action" className="h-9 rounded-full px-4" onClick={() => setFormulario({})}>
              <Plus data-icon="inline-start" />
              Nova família
            </Button>
          </div>
        </div>

        <Numeros quadro={quadro} carregando={isLoading} agora={agora} />

        {quadro && <Esteira leads={quadro.esteira} prazoMinutos={quadro.esperaPrazoMinutos} onAbrir={setAberto} />}

        {quadro?.truncado && (
          <p className="rounded-2xl border border-action-border bg-action-soft px-4 py-2.5 text-sm text-action-soft-foreground">
            O quadro mostra as 500 famílias com conversa mais recente. Use a busca para achar as outras.
          </p>
        )}
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o funil.
        </div>
      )}

      {isLoading && (
        <div className="flex gap-3.5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-[300px] shrink-0 rounded-[24px]" />
          ))}
        </div>
      )}

      {quadro && (
        <QuadroDoFunil
          quadro={quadro}
          agora={agora}
          assistenteAtiva={quadro.assistenteLigada}
          onAbrir={setAberto}
          onMover={pedirMudanca}
          onArrastandoChange={setArrastando}
        />
      )}

      <PainelDoLead
        id={aberto}
        titulos={titulos}
        onFechar={() => setAberto(null)}
        onMover={pedirMudanca}
        onEditar={(lead) => setFormulario({ lead })}
      />

      <FolhaDePerda
        lead={perdendo}
        enviando={mover.isPending}
        onConfirmar={(motivo) => perdendo && executarMudanca(perdendo, "Perdido", motivo)}
        onCancelar={() => setPerdendo(null)}
      />

      <FormularioDoLead
        aberto={!!formulario}
        lead={formulario?.lead}
        onFechar={() => setFormulario(null)}
        onSalvo={(lead) => !formulario?.lead && setAberto(lead.id)}
      />
    </div>
  );
}

function Numeros({ quadro, carregando, agora }: { quadro?: Quadro; carregando: boolean; agora: number }) {
  const emAndamento = quadro?.leads.filter((l) => !ETAPAS_FINAIS.includes(l.etapa)).length;
  const maiorEspera = quadro?.esteira.reduce((m, l) => Math.max(m, l.minutosEsperando ?? 0), 0) ?? 0;
  const semana = agora + 7 * 24 * 60 * 60_000;
  const visitas = quadro?.leads.filter((l) => {
    if (!l.visitaEm || l.etapa !== "VisitaAgendada") return false;
    const t = new Date(l.visitaEm).getTime();
    return t >= agora && t <= semana;
  }).length;
  const matriculados = quadro?.etapas.find((e) => e.etapa === "Matriculado")?.total;

  const itens = [
    { rotulo: "famílias em andamento", valor: emAndamento },
    {
      rotulo: quadro?.esteira.length ? `aguardando a equipe · a mais antiga ${esperaEmTexto(maiorEspera)}` : "aguardando a equipe",
      valor: quadro?.esteira.length,
      alerta: !!quadro?.esteira.length,
    },
    { rotulo: "visitas nos próximos 7 dias", valor: visitas },
    { rotulo: "matriculadas", valor: matriculados },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {itens.map((item) => (
        <div key={item.rotulo} className="rounded-2xl bg-card px-4 py-3 shadow-[0_1px_2px_rgba(42,37,48,.05),0_2px_8px_rgba(42,37,48,.04)]">
          {carregando ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <p className={cn("font-mono text-xl font-medium tabular-nums tracking-[-.02em]", item.alerta && "text-action")}>
              {item.valor ?? "—"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{item.rotulo}</p>
        </div>
      ))}
    </div>
  );
}
