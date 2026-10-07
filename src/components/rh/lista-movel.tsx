import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cartão de uma linha de lista no celular.
 *
 * As tabelas do RH têm sete e oito colunas e rolariam de lado numa tela de 375px; abaixo de `md`
 * cada linha vira um cartão com o essencial no alto, os detalhes embaixo e as ações no rodapé.
 */
export function CartaoDaLista({
  titulo,
  subtitulo,
  etiquetas,
  detalhes,
  acoes,
  className,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  etiquetas?: ReactNode;
  detalhes?: ReactNode;
  acoes?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{titulo}</p>
          {subtitulo && <p className="text-[13px] break-words text-muted-foreground">{subtitulo}</p>}
        </div>
        {etiquetas && <div className="flex shrink-0 flex-wrap justify-end gap-1">{etiquetas}</div>}
      </div>
      {detalhes && <div className="grid gap-1 text-[13px] text-muted-foreground">{detalhes}</div>}
      {acoes && <div className="flex flex-wrap justify-end gap-1 border-t border-border pt-2">{acoes}</div>}
    </div>
  );
}

/** Botão só de ícone, com rótulo para leitor de tela e dica ao passar o mouse. */
export function BotaoDeIcone({
  rotulo,
  icone,
  onClick,
  perigo = false,
  disabled = false,
}: {
  rotulo: string;
  icone: ReactNode;
  onClick: () => void;
  perigo?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={perigo ? "destructive" : "ghost"}
      size="icon-sm"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icone}
    </Button>
  );
}
