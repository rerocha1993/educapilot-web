"use client";

import { Check, Hourglass, X } from "lucide-react";

import {
  ROTULO_DO_MARCO,
  TIPOS_DE_BATIDA,
  motivosEmPalavras,
  rotuloDoTipo,
  type BatidaDoDia,
  type TipoDeBatida,
} from "@/lib/rh/use-meu-ponto";
import { cn } from "@/lib/utils";

/** A batida mais recente de cada tipo (quem teve uma recusada e bateu de novo mostra a nova). */
function ultimaDoTipo(batidas: BatidaDoDia[], tipo: TipoDeBatida): BatidaDoDia | undefined {
  return batidas
    .filter((b) => b.tipo === tipo)
    .sort((a, b) => b.horaLocal.localeCompare(a.horaLocal))[0];
}

/**
 * O dia em quatro marcos — entrada, intervalo, retorno, saída —, cada um com a hora batida e o
 * estado: verde (valeu), âmbar (aguarda a escola), vermelho (recusada) ou vazio. O marco que vem a
 * seguir fica com o anel laranja. Tocar num marco batido abre o comprovante.
 *
 * Abaixo, em palavras simples, o que ficou pendente e por quê.
 */
export function LinhaDoDia({
  batidas,
  proxima,
  onAbrir,
}: {
  batidas: BatidaDoDia[];
  proxima: TipoDeBatida | null;
  onAbrir: (batida: BatidaDoDia) => void;
}) {
  const marcos = TIPOS_DE_BATIDA.map((tipo) => ({ tipo, batida: ultimaDoTipo(batidas, tipo) }));
  const comAviso = marcos.filter(
    (m): m is { tipo: TipoDeBatida; batida: BatidaDoDia } =>
      !!m.batida && (m.batida.situacao === "Pendente" || m.batida.situacao === "Recusada")
  );

  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-4">
        {marcos.map(({ tipo, batida }, i) => {
          const proximo = !batida && proxima === tipo;
          const pendente = batida?.situacao === "Pendente";
          const recusada = batida?.situacao === "Recusada";
          const valida = !!batida && !pendente && !recusada;

          const conteudo = (
            <>
              <span
                className={cn(
                  "relative z-10 grid size-9 place-items-center rounded-full border-2 bg-card",
                  valida && "border-success bg-success text-success-foreground",
                  pendente && "border-warning bg-warning-soft text-warning",
                  recusada && "border-destructive bg-destructive-soft text-destructive",
                  proximo && "border-action text-action",
                  !batida && !proximo && "border-border"
                )}
              >
                {valida && <Check className="size-5" strokeWidth={3} aria-hidden />}
                {pendente && <Hourglass className="size-4" aria-hidden />}
                {recusada && <X className="size-5" strokeWidth={3} aria-hidden />}
                {proximo && <span className="size-2.5 rounded-full bg-action" aria-hidden />}
              </span>
              <span className="mt-1.5 text-xs font-medium text-muted-foreground">{ROTULO_DO_MARCO[tipo]}</span>
              <span
                className={cn(
                  "font-mono text-base font-semibold tabular-nums",
                  !batida && "text-muted-foreground/60"
                )}
              >
                {batida ? batida.horaLocal : "--:--"}
              </span>
            </>
          );

          return (
            <li key={tipo} className="relative">
              {/* Trilho até o próximo marco: parte do centro deste círculo até o centro do seguinte. */}
              {i < marcos.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[18px] left-1/2 h-0.5 w-full -translate-y-1/2",
                    batida && marcos[i + 1].batida ? "bg-success" : "bg-border"
                  )}
                />
              )}
              {batida ? (
                <button
                  type="button"
                  onClick={() => onAbrir(batida)}
                  aria-label={`${rotuloDoTipo(tipo)} às ${batida.horaLocal}. Ver comprovante`}
                  className="relative flex min-h-16 w-full flex-col items-center rounded-lg py-1 active:bg-muted"
                >
                  {conteudo}
                </button>
              ) : (
                <div className="relative flex min-h-16 w-full flex-col items-center py-1">{conteudo}</div>
              )}
            </li>
          );
        })}
      </ol>

      {comAviso.length > 0 && (
        <ul className="grid gap-1.5">
          {comAviso.map(({ tipo, batida }) => (
            <li
              key={batida.id}
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-sm leading-[1.45]",
                batida.situacao === "Pendente"
                  ? "bg-warning-soft text-warning-soft-foreground"
                  : "bg-destructive-soft text-destructive-soft-foreground"
              )}
            >
              <span className="font-semibold">{ROTULO_DO_MARCO[tipo]}</span>
              {batida.situacao === "Pendente"
                ? ` aguarda aprovação${batida.motivos.length > 0 ? `: ${motivosEmPalavras(batida.motivos)}` : ""}.`
                : " foi recusada pela escola. Fale com a secretaria."}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
