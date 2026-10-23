import type { ReactNode } from "react";

import { GRAVIDADE_COR } from "@/lib/tasks/gravidade";
import type {
  NotasDosGraficos,
  PontoDeConvivencia,
  PontoDeFrequencia,
  PontoDoDiario,
} from "@/lib/tasks/use-resumo-do-aluno";

/**
 * Gráficos da ficha do aluno, desenhados em SVG próprio e em escala (a altura da barra é proporcional
 * ao valor, com eixo e linhas de referência). Só usam variáveis do tema (cor, borda, texto), por isso
 * valem no claro e no escuro. Cada gráfico leva uma tabela só para leitor de tela.
 *
 * Mês chega como "yyyy-MM". Proporção chega como fração (0,905 = 90,5%).
 */

const NOMES_DOS_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloDoMes(mes: string) {
  const n = Number(mes.slice(5, 7));
  return NOMES_DOS_MESES[n - 1] ?? mes;
}

const PERCENTUAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// Área de desenho (unidades do viewBox). A margem esquerda guarda os números do eixo.
const LARGURA = 360;
const ALTURA = 190;
const MARGEM = { esq: 34, dir: 8, topo: 16, base: 24 };
const AREA_L = LARGURA - MARGEM.esq - MARGEM.dir;
const AREA_A = ALTURA - MARGEM.topo - MARGEM.base;

const TEXTO = "var(--muted-foreground)";
const LINHA = "var(--border)";

function Moldura({
  titulo,
  explicacao,
  legenda,
  children,
  tabela,
  className,
}: {
  titulo: string;
  explicacao?: ReactNode;
  legenda?: { cor: string; rotulo: string }[];
  children: ReactNode;
  tabela?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`min-w-0 rounded-xl border border-border bg-card p-4 print:break-inside-avoid print:p-3 ${className ?? ""}`}>
      <figcaption>
        <span className="block font-heading text-[14.5px] font-semibold">{titulo}</span>
        {explicacao && <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{explicacao}</span>}
      </figcaption>
      <div className="mt-2">{children}</div>
      {legenda && (
        <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground">
          {legenda.map((l) => (
            <li key={l.rotulo} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: l.cor }} />
              {l.rotulo}
            </li>
          ))}
        </ul>
      )}
      {tabela && <div className="sr-only">{tabela}</div>}
    </figure>
  );
}

function SemDados({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Eixo Y com linhas de referência. `ticks` já em unidades do dado; `formatar` escreve o rótulo. */
function EixoY({ ticks, max, formatar }: { ticks: number[]; max: number; formatar: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => {
        const y = MARGEM.topo + AREA_A - (t / max) * AREA_A;
        return (
          <g key={t}>
            <line x1={MARGEM.esq} x2={LARGURA - MARGEM.dir} y1={y} y2={y} stroke={LINHA} strokeWidth={t === 0 ? 1.2 : 0.8} />
            <text x={MARGEM.esq - 5} y={y + 3.5} textAnchor="end" fontSize={11} fill={TEXTO}>
              {formatar(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function EixoX({ meses, rotulo }: { meses: string[]; rotulo: (m: string) => string }) {
  const passo = AREA_L / Math.max(1, meses.length);
  return (
    <g>
      {meses.map((m, i) => (
        <text key={m} x={MARGEM.esq + passo * (i + 0.5)} y={ALTURA - 7} textAnchor="middle" fontSize={11} fill={TEXTO}>
          {rotulo(m)}
        </text>
      ))}
    </g>
  );
}

function Svg({ descricao, children }: { descricao: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao} className="mx-auto block h-auto w-full max-w-[560px]">
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ Presença */

export function GraficoDePresenca({ pontos, className }: { pontos: PontoDeFrequencia[]; className?: string }) {
  const comChamada = pontos.filter((p) => p.diasLetivos > 0);
  const base = (
    <Moldura
      titulo="Presença por mês"
      explicacao="Dias presente ÷ dias com chamada. Em laranja, os meses abaixo de 75%."
      className={className}
    >
      <SemDados>Nenhuma chamada registrada no período.</SemDados>
    </Moldura>
  );
  if (comChamada.length === 0) return base;

  const passo = AREA_L / Math.max(1, pontos.length);
  const larguraDaBarra = Math.min(26, passo * 0.62);
  const resumo = comChamada.map((p) => `${rotuloDoMes(p.mes)} ${PERCENTUAL.format((p.percentual ?? 0) * 100)}%`).join(", ");

  return (
    <Moldura
      titulo="Presença por mês"
      explicacao="Dias presente ÷ dias com chamada. Em laranja, os meses abaixo de 75%."
      className={className}
      tabela={
        <table>
          <caption>Presença por mês</caption>
          <thead>
            <tr><th>Mês</th><th>Dias com chamada</th><th>Presenças</th><th>Percentual</th></tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.mes}>
                <td>{rotuloDoMes(p.mes)}</td><td>{p.diasLetivos}</td><td>{p.presencas}</td>
                <td>{p.percentual == null ? "sem chamada" : `${PERCENTUAL.format(p.percentual * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <Svg descricao={`Presença por mês: ${resumo}.`}>
        <EixoY ticks={[0, 25, 50, 75, 100]} max={100} formatar={(v) => `${v}%`} />
        {pontos.map((p, i) => {
          const x = MARGEM.esq + passo * i + (passo - larguraDaBarra) / 2;
          if (p.diasLetivos === 0 || p.percentual == null) {
            return (
              <text key={p.mes} x={x + larguraDaBarra / 2} y={MARGEM.topo + AREA_A - 5} textAnchor="middle" fontSize={11} fill={TEXTO}>
                –
              </text>
            );
          }
          const pct = Math.max(0, Math.min(1, p.percentual));
          const altura = pct * AREA_A;
          const y = MARGEM.topo + AREA_A - altura;
          return (
            <g key={p.mes}>
              <rect
                x={x}
                y={y}
                width={larguraDaBarra}
                height={Math.max(altura, 0.5)}
                rx={3}
                fill={pct < 0.75 ? "var(--action-brand)" : "var(--primary)"}
              />
              <text x={x + larguraDaBarra / 2} y={y - 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--foreground)">
                {PERCENTUAL.format(pct * 100)}
              </text>
            </g>
          );
        })}
        <EixoX meses={pontos.map((p) => p.mes)} rotulo={rotuloDoMes} />
      </Svg>
    </Moldura>
  );
}

/* ------------------------------------------------------------------ Convivência */

const SERIES_DE_CONVIVENCIA = [
  { chave: "leve", rotulo: "Leve", cor: GRAVIDADE_COR.Leve },
  { chave: "moderada", rotulo: "Moderada", cor: GRAVIDADE_COR.Moderada },
  { chave: "grave", rotulo: "Grave", cor: GRAVIDADE_COR.Grave },
  { chave: "semGravidade", rotulo: "Sem gravidade informada", cor: GRAVIDADE_COR.semGravidade },
] as const;

/** Sobe o teto do eixo até um valor redondo, para os rótulos ficarem em números inteiros. */
function tetoInteiro(max: number) {
  if (max <= 4) return 4;
  const passo = max <= 10 ? 2 : max <= 20 ? 5 : 10;
  return Math.ceil(max / passo) * passo;
}

export function GraficoDeConvivencia({
  pontos,
  indice,
  className,
}: {
  pontos: PontoDeConvivencia[];
  /** Índice do período todo (já calculado pelo servidor). */
  indice?: number | null;
  className?: string;
}) {
  const total = (p: PontoDeConvivencia) => p.leve + p.moderada + p.grave + p.semGravidade;
  const explicacao = (
    <>
      Ocorrências por mês, empilhadas por gravidade.
      {indice != null && (
        <>
          {" "}
          <strong className="font-semibold text-foreground">Índice de convivência: {indice}</strong> (Leve 1, Moderada 3,
          Grave 5; quanto menor, melhor).
        </>
      )}
    </>
  );

  if (pontos.every((p) => total(p) === 0)) {
    return (
      <Moldura titulo="Convivência por mês" explicacao={explicacao} className={className}>
        <SemDados>Nenhuma ocorrência no período.</SemDados>
      </Moldura>
    );
  }

  const max = tetoInteiro(Math.max(...pontos.map(total)));
  const passo = AREA_L / Math.max(1, pontos.length);
  const larguraDaBarra = Math.min(26, passo * 0.62);
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max].filter((t) => Number.isInteger(t));
  const resumo = pontos
    .filter((p) => total(p) > 0)
    .map((p) => `${rotuloDoMes(p.mes)}: ${p.leve} leve, ${p.moderada} moderada, ${p.grave} grave, ${p.semGravidade} sem gravidade`)
    .join("; ");

  return (
    <Moldura
      titulo="Convivência por mês"
      explicacao={explicacao}
      className={className}
      legenda={SERIES_DE_CONVIVENCIA.map((s) => ({ cor: s.cor, rotulo: s.rotulo }))}
      tabela={
        <table>
          <caption>Ocorrências por mês e gravidade</caption>
          <thead>
            <tr><th>Mês</th><th>Leve</th><th>Moderada</th><th>Grave</th><th>Sem gravidade</th><th>Pontos</th></tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.mes}>
                <td>{rotuloDoMes(p.mes)}</td><td>{p.leve}</td><td>{p.moderada}</td><td>{p.grave}</td>
                <td>{p.semGravidade}</td><td>{p.pontos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <Svg descricao={`Ocorrências por mês e gravidade. ${resumo}.`}>
        <EixoY ticks={ticks} max={max} formatar={(v) => String(v)} />
        {pontos.map((p, i) => {
          const x = MARGEM.esq + passo * i + (passo - larguraDaBarra) / 2;
          let acumulado = 0;
          return (
            <g key={p.mes}>
              {SERIES_DE_CONVIVENCIA.map((s) => {
                const valor = p[s.chave];
                if (valor <= 0) return null;
                const altura = (valor / max) * AREA_A;
                const y = MARGEM.topo + AREA_A - ((acumulado + valor) / max) * AREA_A;
                acumulado += valor;
                return (
                  <rect
                    key={s.chave}
                    x={x}
                    y={y}
                    width={larguraDaBarra}
                    height={altura}
                    fill={s.cor}
                    fillOpacity={s.chave === "semGravidade" ? 0.55 : 1}
                    stroke="var(--card)"
                    strokeWidth={0.8}
                  />
                );
              })}
              {total(p) > 0 && (
                <text
                  x={x + larguraDaBarra / 2}
                  y={MARGEM.topo + AREA_A - (total(p) / max) * AREA_A - 4}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  {total(p)}
                </text>
              )}
            </g>
          );
        })}
        <EixoX meses={pontos.map((p) => p.mes)} rotulo={rotuloDoMes} />
      </Svg>
    </Moldura>
  );
}

/* ------------------------------------------------------------------ Linhas (diário e notas) */

interface SerieDeLinha {
  nome: string;
  cor: string;
  /** Um valor por categoria; nulo = sem dado (a linha se interrompe). */
  valores: (number | null)[];
}

function LinhasEmEscala({
  categorias,
  series,
  max,
  ticks,
  formatarEixo,
  formatarValor,
  descricao,
}: {
  categorias: { chave: string; rotulo: string }[];
  series: SerieDeLinha[];
  max: number;
  ticks: number[];
  formatarEixo: (v: number) => string;
  formatarValor: (v: number) => string;
  descricao: string;
}) {
  const passo = AREA_L / Math.max(1, categorias.length);
  const xDe = (i: number) => MARGEM.esq + passo * (i + 0.5);
  const yDe = (v: number) => MARGEM.topo + AREA_A - (Math.max(0, Math.min(max, v)) / max) * AREA_A;

  return (
    <Svg descricao={descricao}>
      <EixoY ticks={ticks} max={max} formatar={formatarEixo} />
      {series.map((s) => {
        // Trechos contínuos: um mês sem dado interrompe a linha em vez de ligar pontos distantes.
        const trechos: { i: number; v: number }[][] = [];
        s.valores.forEach((v, i) => {
          if (v == null) {
            trechos.push([]);
            return;
          }
          if (trechos.length === 0) trechos.push([]);
          trechos[trechos.length - 1].push({ i, v });
        });
        return (
          <g key={s.nome}>
            {trechos
              .filter((t) => t.length > 1)
              .map((t, k) => (
                <polyline
                  key={k}
                  fill="none"
                  stroke={s.cor}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={t.map((p) => `${xDe(p.i)},${yDe(p.v)}`).join(" ")}
                />
              ))}
            {s.valores.map((v, i) =>
              v == null ? null : (
                <g key={i}>
                  <circle cx={xDe(i)} cy={yDe(v)} r={3.4} fill={s.cor} stroke="var(--card)" strokeWidth={1.2} />
                  <title>{`${s.nome}, ${categorias[i].rotulo}: ${formatarValor(v)}`}</title>
                </g>
              )
            )}
          </g>
        );
      })}
      <EixoX meses={categorias.map((c) => c.chave)} rotulo={(chave) => categorias.find((c) => c.chave === chave)?.rotulo ?? chave} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ Diário */

export function GraficoDoDiario({ pontos, className }: { pontos: PontoDoDiario[]; className?: string }) {
  const explicacao = "Refeições comidas bem ou por inteiro e humor feliz ou calmo, em % do que foi registrado no mês.";
  const temDado = pontos.some((p) => p.boaAceitacao != null || p.humorPositivo != null);
  if (!temDado) {
    return (
      <Moldura titulo="Diário por mês" explicacao={explicacao} className={className}>
        <SemDados>Sem refeições nem humor registrados no período.</SemDados>
      </Moldura>
    );
  }

  const aPercentual = (v?: number | null) => (v == null ? null : v * 100);
  const series: SerieDeLinha[] = [
    { nome: "Comeu bem ou tudo", cor: "var(--primary)", valores: pontos.map((p) => aPercentual(p.boaAceitacao)) },
    { nome: "Humor feliz ou calmo", cor: "var(--success)", valores: pontos.map((p) => aPercentual(p.humorPositivo)) },
  ];

  return (
    <Moldura
      titulo="Diário por mês"
      explicacao={explicacao}
      className={className}
      legenda={series.map((s) => ({ cor: s.cor, rotulo: s.nome }))}
      tabela={
        <table>
          <caption>Diário por mês</caption>
          <thead>
            <tr><th>Mês</th><th>Dias com diário</th><th>Comeu bem ou tudo</th><th>Humor feliz ou calmo</th><th>Sono médio (min)</th></tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.mes}>
                <td>{rotuloDoMes(p.mes)}</td><td>{p.dias}</td>
                <td>{p.boaAceitacao == null ? "sem registro" : `${PERCENTUAL.format(p.boaAceitacao * 100)}%`}</td>
                <td>{p.humorPositivo == null ? "sem registro" : `${PERCENTUAL.format(p.humorPositivo * 100)}%`}</td>
                <td>{p.sonoMedioMin ?? "sem registro"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <LinhasEmEscala
        categorias={pontos.map((p) => ({ chave: p.mes, rotulo: rotuloDoMes(p.mes) }))}
        series={series}
        max={100}
        ticks={[0, 25, 50, 75, 100]}
        formatarEixo={(v) => `${v}%`}
        formatarValor={(v) => `${PERCENTUAL.format(v)}%`}
        descricao="Diário por mês: aceitação das refeições e humor positivo, em porcentagem."
      />
    </Moldura>
  );
}

/* ------------------------------------------------------------------ Notas (reservado) */

const CORES_DAS_MATERIAS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--action)",
  "var(--muted-foreground)",
];

/**
 * Notas por matéria em cada período e, ao lado, o comportamento. O servidor só preenche
 * `graficos.notas` depois que o ramo de notas entrar; até lá este gráfico nem é desenhado.
 * A escala vai de 0 até 10 (ou até a maior média, se passar disso).
 */
export function GraficoDeNotas({ notas, className }: { notas: NotasDosGraficos; className?: string }) {
  const periodos: string[] = [];
  for (const m of notas.materias) for (const p of m.pontos) if (!periodos.includes(p.periodo)) periodos.push(p.periodo);
  for (const c of notas.comportamento) if (!periodos.includes(c.periodo)) periodos.push(c.periodo);

  const valorEm = (pontos: { periodo: string; media?: number | null }[], periodo: string) =>
    pontos.find((p) => p.periodo === periodo)?.media ?? null;

  const materias: SerieDeLinha[] = notas.materias.map((m, i) => ({
    nome: m.materia,
    cor: CORES_DAS_MATERIAS[i % CORES_DAS_MATERIAS.length],
    valores: periodos.map((p) => valorEm(m.pontos, p)),
  }));
  const comportamento: SerieDeLinha = {
    nome: "Comportamento",
    cor: "var(--action-brand)",
    valores: periodos.map((p) => notas.comportamento.find((c) => c.periodo === p)?.valor ?? null),
  };

  const explicacao = "Média de cada matéria por período e o conceito de comportamento.";
  const todos = [...materias, comportamento].flatMap((s) => s.valores).filter((v): v is number => v != null);
  if (periodos.length === 0 || todos.length === 0) {
    return (
      <Moldura titulo="Notas por período" explicacao={explicacao} className={className}>
        <SemDados>Nenhuma nota lançada.</SemDados>
      </Moldura>
    );
  }

  const max = Math.max(10, Math.ceil(Math.max(...todos)));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max].map((t) => Math.round(t * 10) / 10);
  const todasAsSeries = comportamento.valores.some((v) => v != null) ? [...materias, comportamento] : materias;

  return (
    <Moldura
      titulo="Notas por período"
      explicacao={explicacao}
      className={className}
      legenda={todasAsSeries.map((s) => ({ cor: s.cor, rotulo: s.nome }))}
      tabela={
        <table>
          <caption>Notas por período</caption>
          <thead>
            <tr>
              <th>Período</th>
              {todasAsSeries.map((s) => <th key={s.nome}>{s.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {periodos.map((p, i) => (
              <tr key={p}>
                <td>{p}</td>
                {todasAsSeries.map((s) => <td key={s.nome}>{s.valores[i] == null ? "sem nota" : DECIMAL.format(s.valores[i]!)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <LinhasEmEscala
        categorias={periodos.map((p) => ({ chave: p, rotulo: p.length > 6 ? p.slice(0, 6) : p }))}
        series={todasAsSeries}
        max={max}
        ticks={ticks}
        formatarEixo={(v) => DECIMAL.format(v)}
        formatarValor={(v) => DECIMAL.format(v)}
        descricao="Notas por matéria em cada período, e comportamento."
      />
    </Moldura>
  );
}
