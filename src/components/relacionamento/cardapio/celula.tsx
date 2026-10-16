"use client";

import { useState } from "react";
import { Tag } from "lucide-react";

import { ChipsDeEtiquetas } from "@/components/relacionamento/cardapio/comum";
import { ETIQUETAS_DO_PRATO } from "@/lib/relacionamento/cardapio-vocabulario";
import type { CelulaEditada } from "@/lib/relacionamento/cardapio-edicao";
import { cn } from "@/lib/utils";

/** O prato é um texto curto: o servidor aceita até 300 caracteres. */
const MAXIMO_DO_PRATO = 300;

/**
 * Uma célula da grade: o prato em texto curto e as etiquetas de ingrediente em chips pequenos. O
 * botão da etiqueta abre a lista de ingredientes só desta célula; fechada, a célula mostra só o
 * que está marcado. Sem edição (professor), vira texto.
 */
export function CelulaDoPrato({
  valor,
  rotulo,
  onChange,
  somenteLeitura = false,
  className,
}: {
  valor: CelulaEditada | undefined;
  /** "Segunda-feira, almoço": o nome da célula para leitor de tela. */
  rotulo: string;
  onChange: (celula: CelulaEditada) => void;
  somenteLeitura?: boolean;
  className?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const descricao = valor?.descricao ?? "";
  const etiquetas = valor?.etiquetas ?? [];

  if (somenteLeitura) {
    return descricao ? (
      <div className={cn("flex flex-col gap-1", className)}>
        <p className="text-[13px] leading-snug break-words">{descricao}</p>
        <ChipsDeEtiquetas etiquetas={etiquetas} />
      </div>
    ) : (
      <span className={cn("text-[13px] text-muted-foreground/60", className)}>
        —<span className="sr-only"> sem prato</span>
      </span>
    );
  }

  function alternar(id: string) {
    onChange({ descricao, etiquetas: etiquetas.includes(id) ? etiquetas.filter((e) => e !== id) : [...etiquetas, id] });
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="relative">
        <textarea
          aria-label={rotulo}
          value={descricao}
          rows={2}
          maxLength={MAXIMO_DO_PRATO}
          placeholder="Prato"
          onChange={(e) => onChange({ descricao: e.target.value.replace(/\s*\n\s*/g, " "), etiquetas })}
          className="block min-h-[3.1rem] w-full resize-none rounded-md border border-input bg-card py-1 pr-7 pl-1.5 text-[13px] leading-snug outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="button"
          aria-label={`Ingredientes: ${rotulo}`}
          aria-expanded={aberta}
          onClick={() => setAberta((a) => !a)}
          className={cn(
            "absolute top-0.5 right-0.5 grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            etiquetas.length > 0 && "text-warning-soft-foreground"
          )}
        >
          <Tag aria-hidden className="size-3.5" />
        </button>
      </div>

      {!aberta && <ChipsDeEtiquetas etiquetas={etiquetas} />}

      {aberta && (
        <div role="group" aria-label={`Ingredientes: ${rotulo}`} className="flex flex-wrap gap-1">
          {ETIQUETAS_DO_PRATO.map((e) => {
            const marcada = etiquetas.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={marcada}
                onClick={() => alternar(e.id)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10.5px] leading-tight font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  marcada ? "bg-primary text-primary-foreground" : "border border-input bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {e.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
