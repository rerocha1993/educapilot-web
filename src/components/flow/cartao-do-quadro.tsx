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
        "flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 text-left shadow-[0_1px_2px_rgba(42,37,48,.06)] transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
        // Cartão concluído continua no quadro (a lista que conclui é o histórico da semana), mas
        // esmaecido: ele não é mais trabalho a fazer e não pode competir pela atenção.
        concluido && "opacity-55",
        arrastando && "opacity-40"
      )}
    >
      {cartao.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cartao.etiquetas.map((e) => (
            // A cor da etiqueta é escolhida pela escola e não tem contraste garantido contra o
            // fundo (nem no tema escuro): só o ponto usa a cor, o texto fica no tom do sistema.
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10.5px] text-muted-foreground"
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
              {e.nome}
            </span>
          ))}
        </div>
      )}

      <p className={cn("text-sm leading-snug break-words", concluido && "line-through")}>
        {cartao.titulo}
      </p>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
        {cartao.prazo && prazo && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              // Concluído não tem prazo vencido: a cor de alerta some junto com a pendência.
              !concluido && prazo.atrasado && "font-semibold text-destructive",
              !concluido && prazo.hoje && "font-semibold text-action-soft-foreground"
            )}
          >
            <CalendarClock className="size-3.5" />
            <span className="font-mono tabular-nums">{formatarData(cartao.prazo)}</span>
          </span>
        )}

        {cartao.checklist.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-3.5" />
            <span className="font-mono tabular-nums">
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
          <span className="ml-auto flex items-center -space-x-1">
            {cartao.integrantes.slice(0, 3).map((i) => (
              <span
                key={i.userId}
                title={i.nome}
                className="grid size-5 place-items-center rounded-full bg-secondary text-[9.5px] font-semibold text-secondary-foreground ring-1 ring-card"
              >
                {iniciais(i.nome)}
              </span>
            ))}
            {cartao.integrantes.length > 3 && (
              <span className="grid size-5 place-items-center rounded-full bg-muted text-[9.5px] font-semibold ring-1 ring-card">
                +{cartao.integrantes.length - 3}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
