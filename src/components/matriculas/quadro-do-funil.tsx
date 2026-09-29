"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { EtapaDoFunil, EtapaDoQuadro, LeadResumo, Quadro } from "@/lib/matriculas/tipos";
import { COR_DA_ETAPA } from "@/lib/matriculas/rotulos";
import { CardDoLead } from "./card-do-lead";

interface Props {
  quadro: Quadro;
  agora: number;
  assistenteAtiva: boolean;
  onAbrir: (id: string) => void;
  onMover: (lead: LeadResumo, para: EtapaDoFunil) => void;
  /** O botão Reativar do card (Em conversa e Chamar novamente). */
  onReativar?: (lead: LeadResumo) => void;
  /** Reativados nesta tela: o botão fica "Reativada". */
  reativados?: ReadonlySet<string>;
  /** Avisa a página, que desfoca o cabeçalho junto com as colunas. */
  onArrastandoChange?: (arrastando: boolean) => void;
}

/**
 * Dentro da coluna, quem precisa de alguém primeiro: quem espera a equipe (o mais antigo no topo).
 * Na coluna de visitas, a próxima visita primeiro. No resto, a conversa mais recente.
 */
function ordenar(etapa: EtapaDoFunil, leads: LeadResumo[]): LeadResumo[] {
  const tempo = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
  return [...leads].sort((a, b) => {
    const esperaA = a.atendimento === "Equipe" ? 0 : 1;
    const esperaB = b.atendimento === "Equipe" ? 0 : 1;
    if (esperaA !== esperaB) return esperaA - esperaB;
    if (esperaA === 0) return tempo(a.aguardandoEquipeDesde) - tempo(b.aguardandoEquipeDesde);
    if (etapa === "VisitaAgendada") return tempo(a.visitaEm) - tempo(b.visitaEm);
    // Quem vai ser chamado primeiro no topo; quem já recebeu as três, no fim.
    if (etapa === "ChamarNovamente") return (tempo(a.retornoEm) || Number.MAX_SAFE_INTEGER) - (tempo(b.retornoEm) || Number.MAX_SAFE_INTEGER);
    return tempo(b.ultimaInteracaoEm ?? b.criadoEm) - tempo(a.ultimaInteracaoEm ?? a.criadoEm);
  });
}

/**
 * Setas para os lados levam o card à coluna vizinha. O padrão do dnd-kit anda 25px por tecla, o que
 * num quadro de colunas de 300px obrigaria a apertar a seta doze vezes.
 */
const entreColunas: KeyboardCoordinateGetter = (evento, { context }) => {
  const { collisionRect, droppableRects, droppableContainers } = context;
  if (!collisionRect) return undefined;
  if (evento.code !== "ArrowRight" && evento.code !== "ArrowLeft") return undefined;
  evento.preventDefault();

  const centro = collisionRect.left + collisionRect.width / 2;
  const colunas = droppableContainers
    .getEnabled()
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.left - b.left);

  const destino =
    evento.code === "ArrowRight"
      ? colunas.find((r) => r.left + r.width / 2 > centro + 1)
      : [...colunas].reverse().find((r) => r.left + r.width / 2 < centro - 1);
  if (!destino) return undefined;

  return { x: destino.left + (destino.width - collisionRect.width) / 2, y: collisionRect.top };
};

/**
 * A coluna de destino é a que está sob o dedo ou o mouse, como a pessoa espera. A do retângulo do card
 * erra perto das bordas: o card levantado é mais largo que o espaço entre colunas. Sem ponteiro (no
 * teclado), vale o retângulo.
 */
const colunaSobOPonteiro: CollisionDetection = (args) => {
  const sobOPonteiro = pointerWithin(args);
  return sobOPonteiro.length > 0 ? sobOPonteiro : rectIntersection(args);
};

const animacaoDeSoltar: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(.2,.9,.25,1.05)",
};

export function QuadroDoFunil({ quadro, agora, assistenteAtiva, onAbrir, onMover, onReativar, reativados, onArrastandoChange }: Props) {
  const [ativo, setAtivo] = useState<LeadResumo | null>(null);
  const [alvo, setAlvo] = useState<EtapaDoFunil | null>(null);
  // Um clique que chega logo depois de soltar é o fim do gesto de arrastar, não um pedido para abrir.
  const soltouEm = useRef(0);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar um instante: sem isso, rolar o quadro com o dedo arrastaria cards sem querer.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    // Enter fica para abrir a ficha; espaço pega e solta o card.
    useSensor(KeyboardSensor, {
      coordinateGetter: entreColunas,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    })
  );

  const colunas = useMemo(() => {
    const emAndamento = quadro.etapas.filter((e) => e.etapa !== "Perdido").reduce((s, e) => s + e.total, 0);
    return quadro.etapas.map((etapa) => ({
      etapa,
      leads: ordenar(etapa.etapa, quadro.leads.filter((l) => l.etapa === etapa.etapa)),
      proporcao: etapa.etapa === "Perdido" || emAndamento === 0 ? 0 : etapa.total / emAndamento,
    }));
  }, [quadro]);

  const titulo = (etapa: EtapaDoFunil | string | number | undefined) =>
    quadro.etapas.find((e) => e.etapa === etapa)?.titulo ?? String(etapa ?? "");

  const nomeDoLead = (id: string | number) => quadro.leads.find((l) => l.id === id)?.nomeResponsavel ?? "a família";

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nomeDoLead(active.id)} pega. Use as setas para trocar de coluna e espaço para soltar.`,
    onDragOver: ({ active, over }) => (over ? `${nomeDoLead(active.id)} sobre ${titulo(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${nomeDoLead(active.id)} solta em ${titulo(over.id)}.` : `${nomeDoLead(active.id)} voltou para onde estava.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${nomeDoLead(active.id)} voltou para onde estava.`,
  };

  function aoComecar(e: DragStartEvent) {
    const lead = quadro.leads.find((l) => l.id === e.active.id) ?? null;
    setAtivo(lead);
    setAlvo(lead?.etapa ?? null);
    onArrastandoChange?.(true);
    navigator.vibrate?.(8);
  }

  function aoPassar(e: DragOverEvent) {
    setAlvo((e.over?.id as EtapaDoFunil | undefined) ?? null);
  }

  function aoTerminar(e: DragEndEvent) {
    const lead = ativo;
    const para = e.over?.id as EtapaDoFunil | undefined;
    setAtivo(null);
    setAlvo(null);
    onArrastandoChange?.(false);
    soltouEm.current = Date.now();
    if (lead && para && para !== lead.etapa) onMover(lead, para);
  }

  function aoCancelar() {
    setAtivo(null);
    setAlvo(null);
    onArrastandoChange?.(false);
  }

  function abrir(id: string) {
    if (Date.now() - soltouEm.current < 300) return;
    onAbrir(id);
  }

  const arrastando = ativo != null;

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={colunaSobOPonteiro}
      // Rola o quadro e a página só bem perto da borda, e devagar: com o padrão (20% da tela), um card
      // pego perto do rodapé saía rolando a página antes de a pessoa mexer o mouse.
      autoScroll={{ threshold: { x: 0.1, y: 0.08 }, acceleration: 5 }}
      onDragStart={aoComecar}
      onDragOver={aoPassar}
      onDragEnd={aoTerminar}
      onDragCancel={aoCancelar}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable:
            "Para mover a família de etapa, aperte espaço, use as setas para a esquerda e para a direita e aperte espaço de novo para soltar. Enter abre a ficha.",
        },
      }}
    >
      {/* Sai das margens da página: o quadro rola de lado de ponta a ponta. O encaixe da rolagem desliga
          durante o arrasto, senão briga com a rolagem automática perto das bordas. Colunas da mesma
          altura: soltar no vazio embaixo de uma coluna curta também conta. */}
      <div
        className={cn(
          "-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] md:-mx-6 md:px-6",
          !arrastando && "snap-x snap-proximity"
        )}
      >
        <div className="flex w-max items-stretch gap-3.5">
          {colunas.map(({ etapa, leads, proporcao }) => (
            <Coluna
              key={etapa.etapa}
              etapa={etapa}
              proporcao={proporcao}
              arrastando={arrastando}
              ehAlvo={alvo === etapa.etapa}
            >
              {leads.length === 0 ? (
                <p className="rounded-2xl border-[1.5px] border-dashed border-border-dashed px-2 py-6 text-center text-xs text-muted-foreground">
                  {arrastando ? "Solte aqui" : "Nenhuma família nesta etapa"}
                </p>
              ) : (
                leads.map((lead) => (
                  <CardArrastavel
                    key={lead.id}
                    lead={lead}
                    agora={agora}
                    assistenteAtiva={assistenteAtiva}
                    onAbrir={abrir}
                    onReativar={onReativar}
                    reativado={reativados?.has(lead.id)}
                  />
                ))
              )}
            </Coluna>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={animacaoDeSoltar}>
        {ativo ? <CardDoLead lead={ativo} agora={agora} assistenteAtiva={assistenteAtiva} levantado /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Coluna({
  etapa,
  proporcao,
  arrastando,
  ehAlvo,
  children,
}: {
  etapa: EtapaDoQuadro;
  proporcao: number;
  arrastando: boolean;
  ehAlvo: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: etapa.etapa });
  // O desfoque é por coluna, e não por card: um filtro por coluna custa oito camadas para a placa de
  // vídeo, um por card custaria quinhentas.
  const atras = arrastando && !ehAlvo;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${etapa.titulo}: ${etapa.total} ${etapa.total === 1 ? "família" : "famílias"}`}
      className={cn(
        "flex w-[300px] shrink-0 snap-start flex-col rounded-[24px] bg-muted transition-[background-color,box-shadow] duration-200 max-md:w-[84vw] dark:bg-foreground/[.035]",
        ehAlvo && arrastando && "bg-accent shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--primary)_40%,transparent)] dark:bg-accent"
      )}
      style={{ ["--cor-etapa" as string]: COR_DA_ETAPA[etapa.etapa] }}
    >
      <header className={cn("flex flex-col gap-2 px-3.5 pb-2.5 pt-3.5 transition-opacity duration-300", atras && "opacity-55")}>
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-[9px] rounded-full bg-[var(--cor-etapa)]" />
          <h2 className="font-heading text-[15px] font-semibold tracking-[-.01em]">{etapa.titulo}</h2>
          <span className="ml-auto min-w-7 rounded-full bg-card px-2 py-0.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
            {etapa.total}
          </span>
        </div>
        <p className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>{etapa.descricao}</span>
          {etapa.aguardandoEquipe > 0 && (
            <span className="font-semibold text-action">{etapa.aguardandoEquipe} aguardando</span>
          )}
          {etapa.frios > 0 && (
            <span className="font-semibold text-action">
              {etapa.frios} {etapa.frios === 1 ? "frio" : "frios"}
            </span>
          )}
        </p>
        <div className="h-[3px] overflow-hidden rounded-full bg-foreground/[.07]" aria-hidden>
          <div
            className="h-full rounded-full bg-[var(--cor-etapa)] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(proporcao * 100)}%` }}
          />
        </div>
      </header>

      <div
        className={cn(
          "flex max-h-[70dvh] flex-col gap-2.5 overflow-y-auto px-2.5 pb-3.5 pt-1 [scrollbar-width:none] md:max-h-[calc(100dvh-20rem)] [&::-webkit-scrollbar]:hidden",
          "transition-[filter,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          atras && "scale-[.985] opacity-50 blur-[3px] saturate-[.7]"
        )}
      >
        {children}
      </div>
    </section>
  );
}

function CardArrastavel({
  lead,
  agora,
  assistenteAtiva,
  onAbrir,
  onReativar,
  reativado,
}: {
  lead: LeadResumo;
  agora: number;
  assistenteAtiva: boolean;
  onAbrir: (id: string) => void;
  onReativar?: (lead: LeadResumo) => void;
  reativado?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <CardDoLead
      ref={setNodeRef}
      lead={lead}
      agora={agora}
      assistenteAtiva={assistenteAtiva}
      onReativar={onReativar}
      reativado={reativado}
      vazio={isDragging}
      {...attributes}
      {...listeners}
      aria-roledescription="card arrastável"
      aria-label={`${lead.nomeResponsavel}${lead.nomeCrianca ? `, ${lead.nomeCrianca}` : ""}`}
      onClick={() => onAbrir(lead.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !isDragging) onAbrir(lead.id);
      }}
    />
  );
}
