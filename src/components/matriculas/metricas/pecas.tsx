"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COR_DA_ETAPA, TITULO_PADRAO_DA_ETAPA, esperaEmTexto } from "@/lib/matriculas/rotulos";
import type { FamiliaDaLista, FamiliaNaFila, IndicadorComparado } from "@/lib/matriculas/tipos";

// ------------------------------------------------------------------ formatação

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const umaCasa = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const real = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const numero = (n: number) => inteiro.format(n);

export function percentual(valor: number | null | undefined, casas = 0): string {
  if (valor == null) return "—";
  return `${valor.toFixed(casas).replace(".", ",")}%`;
}

/** Horas como "45 min", "3h 20min" ou "2 dias". "1 dia" só para ~24h de verdade: meio dia de atraso não se esconde. */
export function duracao(horas: number | null | undefined): string {
  if (horas == null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 24) {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }
  const dias = horas / 24;
  if (Math.abs(dias - 1) < 0.05) return "1 dia";
  return `${umaCasa.format(dias).replace(/,0$/, "")} dias`;
}

function valorDoIndicador(i: IndicadorComparado, v: number | null | undefined): string {
  if (v == null) return "—";
  if (i.unidade === "percentual") return percentual(v, 1);
  if (i.unidade === "horas") return duracao(v);
  return numero(v);
}

// ------------------------------------------------------------------ variação contra o período anterior

/**
 * ▲/▼ contra o período anterior. A cor diz se foi para o lado bom, e não só se subiu: o tempo de resposta cair
 * é melhora. Sem o dado de um dos lados não há seta, só o aviso.
 */
export function Variacao({ item, curto = false }: { item: IndicadorComparado | undefined; curto?: boolean }) {
  if (!item) return null;
  if (item.sentido == null) {
    return <span className="text-[12px] text-muted-foreground">sem dado no período anterior</span>;
  }
  const cor = item.melhorou == null ? "text-muted-foreground" : item.melhorou ? "text-success" : "text-destructive";
  const seta = item.sentido === "Subiu" ? "▲" : item.sentido === "Desceu" ? "▼" : "=";
  const diferenca = item.diferenca ?? 0;
  const sinal = diferenca > 0 ? "+" : diferenca < 0 ? "−" : "";
  const modulo = Math.abs(diferenca);
  const texto =
    item.sentido === "Igual"
      ? "igual ao anterior"
      : item.unidade === "percentual"
        ? `${sinal}${umaCasa.format(modulo)} pontos`
        : item.unidade === "horas"
          ? `${sinal}${duracao(modulo)}`
          : `${sinal}${numero(modulo)}${item.variacaoPercentual != null ? ` (${sinal}${umaCasa.format(Math.abs(item.variacaoPercentual))}%)` : ""}`;
  return (
    <span
      className={cn("inline-flex items-baseline gap-1 text-[12px] font-medium tabular-nums", cor)}
      title={`Período anterior: ${valorDoIndicador(item, item.anterior)}`}
    >
      <span aria-hidden>{seta}</span>
      <span>{texto}</span>
      {!curto && <span className="font-normal text-muted-foreground">vs {valorDoIndicador(item, item.anterior)}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ cartões

export function Cartao({
  titulo,
  texto,
  direita,
  children,
  className,
}: {
  titulo: string;
  texto?: ReactNode;
  direita?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-[24px] border border-border bg-card p-5 print:break-inside-avoid print:rounded-xl print:p-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{titulo}</h2>
        {direita && <div className="shrink-0 text-[12.5px] text-muted-foreground">{direita}</div>}
      </div>
      {texto && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{texto}</p>}
      <div className="mt-4 print:mt-2">{children}</div>
    </section>
  );
}

export function Tile({
  rotulo,
  valor,
  detalhe,
  variacao,
  progresso,
  alerta,
  className,
}: {
  rotulo: string;
  valor: string;
  /** O que vem depois do valor, como "/ 30 meta". */
  detalhe?: ReactNode;
  variacao?: ReactNode;
  /** 0 a 100. Sem valor, sem barra. */
  progresso?: number;
  alerta?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[24px] bg-card px-5 py-4 shadow-[0_1px_2px_rgba(42,37,48,.05),0_2px_8px_rgba(42,37,48,.04)] print:break-inside-avoid print:rounded-xl print:border print:border-border print:px-3 print:py-2 print:shadow-none",
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{rotulo}</p>
      <p className="mt-1.5 font-mono text-[28px] font-medium leading-none tabular-nums tracking-[-.02em] print:text-[22px]">{valor}</p>
      {progresso != null && (
        <div className="mt-2.5 h-1.5 rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full", alerta ? "bg-warning" : "bg-success")}
            style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
          />
        </div>
      )}
      {variacao && <p className="mt-2">{variacao}</p>}
      {detalhe && <p className={cn("mt-1.5 text-[12.5px] leading-snug", alerta ? "text-warning" : "text-muted-foreground")}>{detalhe}</p>}
    </div>
  );
}

/** Um recado dentro do cartão, como o "maior vazamento" do funil. */
export function Destaque({ children, alerta }: { children: ReactNode; alerta?: boolean }) {
  return (
    <p
      className={cn(
        "mt-3 rounded-xl px-3 py-2 text-[13px] leading-snug",
        alerta ? "bg-warning-soft text-warning-soft-foreground" : "bg-muted/60 text-foreground"
      )}
    >
      {children}
    </p>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

// ------------------------------------------------------------------ barras e tabela

export interface ItemDeBarra {
  chave: string;
  titulo: string;
  total: number;
  /** O texto à direita do número, como "42%". */
  auxiliar?: string;
  cor?: string;
  /** Barra riscada, para o que saiu do funil. */
  riscada?: boolean;
  alerta?: boolean;
}

/** Barras horizontais de uma série: a cor é uma, o comprimento é a quantidade. Linha zerada fica, apagada. */
export function Barras({ itens, maximo, rotulo, vazio }: { itens: ItemDeBarra[]; maximo?: number; rotulo: string; vazio?: string }) {
  if (itens.length === 0) return <Vazio>{vazio ?? "Nada para mostrar neste período."}</Vazio>;
  const maior = Math.max(1, maximo ?? 0, ...itens.map((i) => i.total));
  return (
    <ul aria-label={rotulo} className="flex flex-col gap-2.5">
      {itens.map((i) => {
        const texto = `${i.titulo}: ${numero(i.total)}${i.auxiliar ? ` (${i.auxiliar})` : ""}`;
        return (
          <li key={i.chave} title={texto} aria-label={texto} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className={cn("min-w-0", i.total === 0 && "text-muted-foreground")}>{i.titulo}</span>
              <span className={cn("shrink-0 font-mono text-[12.5px] tabular-nums", i.alerta ? "font-semibold text-warning" : "font-medium")}>
                {numero(i.total)}
                {i.auxiliar && <span className="ml-1.5 font-normal text-muted-foreground">{i.auxiliar}</span>}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted" aria-hidden>
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none print:transition-none", i.riscada && "opacity-60")}
                style={{
                  width: i.total === 0 ? 0 : `${Math.max(2, (i.total / maior) * 100)}%`,
                  background: i.riscada
                    ? `repeating-linear-gradient(135deg, ${i.cor ?? "var(--chart-3)"} 0 6px, transparent 6px 10px)`
                    : (i.cor ?? "var(--chart-1)"),
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** "Ver como tabela": os mesmos números, para quem não enxerga o gráfico ou quer copiar. Some na impressão (o gráfico basta). */
export function TabelaAlternativa({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: { chave: string; celulas: (string | number)[] }[];
}) {
  if (linhas.length === 0) return null;
  return (
    <details className="mt-3 text-[13px] print:hidden">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabela</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[260px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[.1em] text-muted-foreground">
              {colunas.map((c, i) => (
                <th key={c} scope="col" className={cn("py-1.5 pr-3 font-bold", i > 0 && "text-right")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className="border-b border-border/60 last:border-0">
                {l.celulas.map((c, i) => (
                  <td key={i} className={cn("py-1.5 pr-3 tabular-nums", i > 0 && "text-right font-mono")}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ------------------------------------------------------------------ listas de famílias

function nomeDaFamilia(f: { nomeResponsavel: string; nomeCrianca?: string | null }) {
  return (
    <>
      <span className="font-medium">{f.nomeResponsavel}</span>
      {f.nomeCrianca && <span className="text-muted-foreground"> · {f.nomeCrianca}</span>}
    </>
  );
}

function Pontinho({ etapa }: { etapa: FamiliaDaLista["etapa"] }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: COR_DA_ETAPA[etapa] }} aria-hidden />;
}

/** "há 3 dias" a partir de horas. */
function haQuanto(horas: number): string {
  return esperaEmTexto(Math.round(horas * 60));
}

/** Quem a equipe liga: cada linha abre a ficha da família. */
export function ListaDeFamiliasAbertas({
  itens,
  total,
  limite,
  vazio,
  onAbrir,
}: {
  itens: FamiliaDaLista[];
  total: number;
  limite?: number;
  vazio: string;
  onAbrir: (id: string) => void;
}) {
  if (itens.length === 0) return <Vazio>{vazio}</Vazio>;
  const visiveis = limite ? itens.slice(0, limite) : itens;
  return (
    <ul className="flex flex-col">
      {visiveis.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onAbrir(f.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted print:px-0"
          >
            <Pontinho etapa={f.etapa} />
            <span className="min-w-0 flex-1 truncate">
              {nomeDaFamilia(f)}
              {f.turma && <span className="text-muted-foreground"> · {f.turma}</span>}
            </span>
            <span className="shrink-0 text-[12px] text-muted-foreground">{TITULO_PADRAO_DA_ETAPA[f.etapa]}</span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{haQuanto(f.horasSemInteracao)}</span>
          </button>
        </li>
      ))}
      {total > visiveis.length && (
        <li className="px-2 pt-1 text-[12px] text-muted-foreground">
          E mais {total - visiveis.length}, da mais esquecida para a mais recente. A lista completa está na página Métricas.
        </li>
      )}
    </ul>
  );
}

/** A fila de atendimento agora: quem espera a equipe responder. */
export function ListaDaFila({ itens, total, limite, onAbrir }: { itens: FamiliaNaFila[]; total: number; limite?: number; onAbrir: (id: string) => void }) {
  if (itens.length === 0) return <Vazio>Ninguém esperando a equipe agora.</Vazio>;
  const visiveis = limite ? itens.slice(0, limite) : itens;
  return (
    <ul className="flex flex-col">
      {visiveis.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onAbrir(f.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted print:px-0"
          >
            <Pontinho etapa={f.etapa} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{nomeDaFamilia(f)}</span>
              {f.motivo && <span className="block truncate text-[12px] text-muted-foreground">{f.motivo}</span>}
            </span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-warning">{esperaEmTexto(f.minutosEsperando)}</span>
          </button>
        </li>
      ))}
      {total > visiveis.length && <li className="px-2 pt-1 text-[12px] text-muted-foreground">E mais {total - visiveis.length}, na ordem de chegada.</li>}
    </ul>
  );
}
