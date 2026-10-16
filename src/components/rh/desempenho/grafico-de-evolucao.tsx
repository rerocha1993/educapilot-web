"use client";

import { useState } from "react";

import { formatarSoData } from "@/lib/format/date";
import { formatarNota, type Faixa, type Marcador, type PontoDaEvolucao } from "@/lib/rh/use-desempenho";

const LARGURA = 640;
const ALTURA = 236;
const MARGEM = { esq: 32, dir: 16, topo: 14, base: 54 };
const DIA = 86_400_000;

const dia = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

interface Dica {
  /** Posição horizontal em % da largura do gráfico. */
  x: number;
  y: number;
  titulo: string;
  detalhe?: string;
}

const COR_DO_MARCADOR: Record<string, string> = {
  Advertencia: "fill-destructive stroke-destructive",
  Reconhecimento: "fill-success stroke-success",
  Marco: "fill-primary stroke-primary",
};

const ROTULO_DO_MARCADOR: Record<string, string> = {
  Advertencia: "Advertência",
  Reconhecimento: "Reconhecimento",
  Marco: "Marco de carreira",
};

/**
 * Evolução da nota por fechamento (ciclo ou mês), em SVG próprio: a linha, as faixas da escola como pano de fundo e, na
 * base, advertências, reconhecimentos e marcos de carreira no dia em que aconteceram. O último ponto, de hoje, é
 * provisório (tracejado) porque ainda não foi fechado. O histórico vem dos snapshots: não muda quando os pesos mudam.
 */
export function GraficoDeEvolucao({
  pontos,
  marcadores,
  faixas,
}: {
  pontos: PontoDaEvolucao[];
  marcadores: Marcador[];
  faixas: Faixa[];
}) {
  const [dica, setDica] = useState<Dica | null>(null);

  if (pontos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
        Ainda não há nota para mostrar. O gráfico aparece depois do primeiro fechamento de ciclo ou de mês.
      </div>
    );
  }

  const datasDosPontos = pontos.map((p) => dia(p.data));
  const menor = Math.min(...datasDosPontos);
  const maior = Math.max(...datasDosPontos);

  // Marcador muito antigo ou futuro esmagaria a linha: só entram os de até 90 dias fora do intervalo das notas.
  const visiveis = marcadores.filter((m) => {
    const d = dia(m.data);
    return d >= menor - 90 * DIA && d <= maior + 90 * DIA;
  });

  const tmin = Math.min(menor, ...visiveis.map((m) => dia(m.data)));
  const tmax = Math.max(maior, ...visiveis.map((m) => dia(m.data)));
  const span = Math.max(tmax - tmin, 30 * DIA);

  const x = (t: number) => {
    const meio = (tmax + tmin) / 2;
    return MARGEM.esq + ((t - (meio - span / 2)) / span) * (LARGURA - MARGEM.esq - MARGEM.dir);
  };
  const y = (v: number) => MARGEM.topo + (1 - Math.max(0, Math.min(100, v)) / 100) * (ALTURA - MARGEM.topo - MARGEM.base);

  const linhasDeGrade = Array.from(new Set([0, 100, ...faixas.map((f) => f.minimo).filter((m) => m > 0 && m < 100)])).sort((a, b) => a - b);
  const fechados = pontos.filter((p) => !p.provisoria);
  const provisorio = pontos.find((p) => p.provisoria);
  const caminho = fechados.map((p, i) => `${i === 0 ? "M" : "L"}${x(dia(p.data)).toFixed(1)},${y(p.nota).toFixed(1)}`).join(" ");
  const yDosMarcadores = ALTURA - MARGEM.base + 18;

  function mostrar(cx: number, cy: number, titulo: string, detalhe?: string) {
    setDica({ x: (cx / LARGURA) * 100, y: (cy / ALTURA) * 100, titulo, detalhe });
  }

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Evolução da nota: ${pontos.map((p) => `${p.rotulo} ${formatarNota(p.nota)}`).join("; ")}`}
        >
          {linhasDeGrade.map((v) => (
            <g key={v}>
              <line x1={MARGEM.esq} x2={LARGURA - MARGEM.dir} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray={v === 0 || v === 100 ? undefined : "3 4"} />
              <text x={MARGEM.esq - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {v}
              </text>
            </g>
          ))}

          {fechados.length > 1 && <path d={caminho} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

          {provisorio && fechados.length > 0 && (
            <line
              x1={x(dia(fechados[fechados.length - 1].data))}
              y1={y(fechados[fechados.length - 1].nota)}
              x2={x(dia(provisorio.data))}
              y2={y(provisorio.nota)}
              className="stroke-primary"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {pontos.map((p) => {
            const cx = x(dia(p.data));
            const cy = y(p.nota);
            const texto = `${p.rotulo}: ${formatarNota(p.nota)} (${p.faixa})`;
            return (
              <g key={p.referencia}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  tabIndex={0}
                  role="img"
                  aria-label={texto}
                  className={p.provisoria ? "fill-card stroke-action-brand outline-none" : "fill-primary stroke-card outline-none"}
                  strokeWidth="2"
                  onMouseEnter={() => mostrar(cx, cy, `${formatarNota(p.nota)} · ${p.faixa}`, `${p.rotulo}${p.provisoria ? "" : `, ${formatarSoData(p.data)}`}`)}
                  onMouseLeave={() => setDica(null)}
                  onFocus={() => mostrar(cx, cy, `${formatarNota(p.nota)} · ${p.faixa}`, p.rotulo)}
                  onBlur={() => setDica(null)}
                />
                {pontos.length <= 7 && (
                  <text x={cx} y={y(0) + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {p.rotulo.length > 12 ? `${p.rotulo.slice(0, 11)}…` : p.rotulo}
                  </text>
                )}
              </g>
            );
          })}

          <line x1={MARGEM.esq} x2={LARGURA - MARGEM.dir} y1={yDosMarcadores} y2={yDosMarcadores} className="stroke-border" />
          {visiveis.map((m, i) => {
            const cx = x(dia(m.data));
            const cor = COR_DO_MARCADOR[m.tipo] ?? "fill-muted-foreground stroke-muted-foreground";
            const titulo = `${ROTULO_DO_MARCADOR[m.tipo] ?? m.tipo}, ${formatarSoData(m.data)}`;
            const handlers = {
              tabIndex: 0 as const,
              role: "img" as const,
              "aria-label": `${titulo}: ${m.titulo}`,
              onMouseEnter: () => mostrar(cx, yDosMarcadores, m.titulo, titulo),
              onMouseLeave: () => setDica(null),
              onFocus: () => mostrar(cx, yDosMarcadores, m.titulo, titulo),
              onBlur: () => setDica(null),
            };
            return m.tipo === "Advertencia" ? (
              <polygon key={i} points={`${cx},${yDosMarcadores - 6} ${cx + 6},${yDosMarcadores + 5} ${cx - 6},${yDosMarcadores + 5}`} className={`${cor} outline-none`} {...handlers} />
            ) : m.tipo === "Reconhecimento" ? (
              <circle key={i} cx={cx} cy={yDosMarcadores} r="5" className={`${cor} outline-none`} {...handlers} />
            ) : (
              <rect key={i} x={cx - 5} y={yDosMarcadores - 5} width="10" height="10" rx="2" className={`${cor} outline-none`} {...handlers} />
            );
          })}
        </svg>

        {dica && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 max-w-56 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${Math.max(12, Math.min(88, dica.x))}%`, top: `calc(${dica.y}% - 10px)` }}
          >
            <p className="font-semibold break-words">{dica.titulo}</p>
            {dica.detalhe && <p className="text-muted-foreground">{dica.detalhe}</p>}
          </div>
        )}
      </div>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="0" x2="16" y1="4" y2="4" className="stroke-primary" strokeWidth="2" />
          </svg>
          Nota fechada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="0" x2="16" y1="4" y2="4" className="stroke-primary" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          Hoje (parcial)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <polygon points="5,0 10,9 0,9" className="fill-destructive" />
          </svg>
          Advertência
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4.5" className="fill-success" />
          </svg>
          Reconhecimento
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <rect width="10" height="10" rx="2" className="fill-primary" />
          </svg>
          Marco
        </span>
      </figcaption>
    </figure>
  );
}
