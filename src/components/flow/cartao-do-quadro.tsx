"use client";

import { CalendarClock, FileText, ListChecks, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatarData } from "@/lib/format/date";
import type { Cartao } from "@/lib/flow/use-tarefas";

/** Iniciais do integrante: primeiro e último nome, que é como a equipe se chama no dia a dia. */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Situação do prazo.
 *
 * O prazo é o fim do dia, então "atrasado" é simplesmente o instante já ter passado. "Hoje" sai da
 * comparação dos dois dias já formatados no fuso da escola — é a mesma data que a pessoa lê no
 * cartão, e evita uma segunda conta de fuso que poderia discordar do que está escrito ali.
 */
function situacaoDoPrazo(prazo: string) {
  const atrasado = new Date(prazo).getTime() < Date.now();
  return { atrasado, hoje: !atrasado && formatarData(prazo) === formatarData(new Date()) };
}

export function CartaoDoQuadro({
  cartao,
  arrastando,
  onAbrir,
  onDragStart,
  onDragEnd,
}: {
  cartao: Cartao;
  arrastando: boolean;
  onAbrir: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const concluido = !!cartao.concluidoEm;
  const prazo = cartao.prazo ? situacaoDoPrazo(cartao.prazo) : null;
  const feitos = cartao.checklist.filter((i) => i.feito).length;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
      className={cn(
        // Peça sólida sobre o vidro da coluna: fundo do cartão + um gradiente vertical de ~3%,
        // no limite do perceptível. É ele que dá a "solidez" sem transformar o cartão em botão —
        // no escuro o gradiente inverte, porque lá é o topo que recebe a luz.
        "flex cursor-grab flex-col gap-1.5 rounded-lg border border-foreground/10 bg-card bg-linear-to-b from-transparent to-foreground/[0.035] p-2.5 text-left dark:border-foreground/15 dark:from-foreground/[0.055] dark:to-transparent",
        // Sombra de contato curta parada; ao passar o mouse entra a segunda camada, difusa, e o
        // cartão sobe 1px. Um pixel é de propósito: o suficiente para a mão sentir, pouco o
        // bastante para a coluna não "tremer" enquanto o ponteiro corre a lista.
        "shadow-[0_1px_2px_var(--kanban-tinta-contato),inset_0_1px_0_var(--kanban-brilho)]",
        "hover:shadow-[0_1px_2px_var(--kanban-tinta-contato),0_6px_18px_-8px_var(--kanban-tinta-difusa),inset_0_1px_0_var(--kanban-brilho)]",
        "motion-safe:transition-[box-shadow,translate,scale,rotate] motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px",
        // Anel de foco com folga: o cartão tem fundo claro e um anel colado na borda sumiria
        // dentro do próprio contorno.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Alvo de toque no celular: no desktop a altura vem do conteúdo.
        "max-md:min-h-11 active:cursor-grabbing",
        // Cartão concluído continua no quadro (a lista que conclui é o histórico da semana), mas
        // esmaecido: ele não é mais trabalho a fazer e não pode competir pela atenção.
        concluido && "opacity-55",
        // Arrastando: o cartão "sai da mesa" — gira, cresce um tico e ganha a sombra alta. A
        // rotação é o que mais vende o gesto, e some inteira em prefers-reduced-motion.
        arrastando &&
          "opacity-70 shadow-[0_16px_34px_-10px_var(--kanban-tinta-alta),inset_0_1px_0_var(--kanban-brilho)] motion-safe:rotate-[1.5deg] motion-safe:scale-[1.02]"
      )}
    >
      {cartao.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cartao.etiquetas.map((e) => (
            // A cor da etiqueta é escolhida pela escola e não tem contraste garantido contra o
            // fundo (nem no tema escuro): só o ponto usa a cor, o texto fica no tom do sistema.
            // Chip menor e com contorno de 1px em vez de bloco de fundo: encolhido, o preenchimento
            // sozinho virava mancha; o fio define a forma e devolve o ar entre as etiquetas.
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.04] px-1.5 py-[1.5px] text-[10px] leading-[14px] font-medium text-muted-foreground"
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
              {e.nome}
            </span>
          ))}
        </div>
      )}

      <p
        className={cn(
          // Tracking levemente negativo: no corpo curto do cartão o texto default fica frouxo e
          // o título perde a cara de "uma coisa só".
          "text-sm leading-snug tracking-[-0.006em] break-words",
          concluido && "line-through"
        )}
      >
        {cartao.titulo}
      </p>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
        {cartao.prazo && prazo && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              // Concluído não tem prazo vencido: a cor de alerta some junto com a pendência.
              !concluido && prazo.atrasado && "font-semibold text-destructive",
              // "Hoje" é laranja nos dois temas, mas o laranja escuro de --action-soft-foreground
              // não é redefinido no tema escuro e ficaria em ~2.9:1 sobre o cartão. No escuro
              // troca pelo laranja claro do par semântico (mesma cor de pendência do guia), que
              // passa em AA com folga.
              !concluido &&
                prazo.hoje &&
                "font-semibold text-action-soft-foreground dark:text-warning-soft-foreground"
            )}
          >
            <CalendarClock className="size-3.5" />
            {/* Data e contagem em tabular com tracking negativo: número monoespaçado abre demais
                e some no meio da linha de ícones. */}
            <span className="font-mono tracking-[-0.02em] tabular-nums">
              {formatarData(cartao.prazo)}
            </span>
          </span>
        )}

        {cartao.checklist.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-3.5" />
            <span className="font-mono tracking-[-0.02em] tabular-nums">
              {feitos}/{cartao.checklist.length}
            </span>
          </span>
        )}

        {/* Cartão que nasceu sozinho: a marca explica por que ele apareceu no quadro sem ninguém
            ter escrito nada. Só o ícone, porque é informação de origem, não de trabalho. */}
        {cartao.origem === "formulario" && (
          <FileText className="size-3.5" aria-label="Criado por um envio de formulário" />
        )}
        {cartao.origem === "recorrencia" && (
          <Repeat className="size-3.5" aria-label="Criado por uma tarefa que se repete" />
        )}

        {cartao.integrantes.length > 0 && (
          // Anel de 1.5px no tom do cartão para recortar as iniciais que se sobrepõem: com 1px a
          // pilha embola e as duas letras de trás viram mancha.
          <span className="ml-auto flex items-center -space-x-1">
            {cartao.integrantes.slice(0, 3).map((i) => (
              <span
                key={i.userId}
                title={i.nome}
                className="grid size-5 place-items-center rounded-full bg-secondary text-[9.5px] font-semibold tracking-[-0.02em] text-secondary-foreground ring-[1.5px] ring-card"
              >
                {iniciais(i.nome)}
              </span>
            ))}
            {cartao.integrantes.length > 3 && (
              <span className="grid size-5 place-items-center rounded-full bg-muted text-[9.5px] font-semibold tracking-[-0.02em] ring-[1.5px] ring-card">
                +{cartao.integrantes.length - 3}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
