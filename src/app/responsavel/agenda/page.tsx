"use client";

import { useState } from "react";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { ErroDoPortal, LinhaDaAgenda, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  useAgendaDoPortal,
  useRotinaDosFilhos,
  type RotinaDoFilho,
} from "@/lib/relacionamento/use-portal-familia";
import {
  capitalizar,
  deslocarMes,
  diaComSemana,
  diaDaSemana,
  diaEMes,
  diasNoMes,
  DIAS_DA_SEMANA_LONGOS,
  faixaDeHorario,
  lerIso,
  montarIso,
  NOMES_DOS_MESES,
  somarDias,
} from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

type Visao = "hoje" | "semana" | "mes";
type Aba = "agenda" | "rotina";

const VISOES = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
] as const;

const ABAS = [
  { id: "agenda", rotulo: "Agenda" },
  { id: "rotina", rotulo: "Rotina da semana" },
] as const;

/** Primeiro e último dia do período mostrado, em yyyy-MM-dd. */
function periodo(visao: Visao, ancora: string): { de: string; ate: string } {
  if (visao === "hoje") return { de: ancora, ate: ancora };

  if (visao === "semana") {
    // A semana vai de segunda a domingo.
    const segunda = somarDias(ancora, -((diaDaSemana(ancora) + 6) % 7));
    return { de: segunda, ate: somarDias(segunda, 6) };
  }

  const d = lerIso(ancora);
  if (!d) return { de: ancora, ate: ancora };
  return { de: montarIso(d.ano, d.mes, 1), ate: montarIso(d.ano, d.mes, diasNoMes(d.ano, d.mes)) };
}

function mover(visao: Visao, ancora: string, passo: -1 | 1): string {
  if (visao === "hoje") return somarDias(ancora, passo);
  if (visao === "semana") return somarDias(ancora, passo * 7);
  const d = lerIso(ancora);
  if (!d) return ancora;
  const novo = deslocarMes(d.ano, d.mes, passo);
  return montarIso(novo.ano, novo.mes, 1);
}

function titulo(visao: Visao, ancora: string, hoje: string): string {
  if (visao === "hoje") return ancora === hoje ? "Hoje" : capitalizar(diaComSemana(ancora));
  const { de, ate } = periodo(visao, ancora);
  if (visao === "semana") return `${diaEMes(de)} a ${diaEMes(ate)}`;
  const d = lerIso(ancora);
  return d ? `${capitalizar(NOMES_DOS_MESES[d.mes - 1])} ${d.ano}` : "";
}

export default function AgendaDoResponsavelPage() {
  const parametros = useQueryStringLocal();
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const aba: Aba = escolhida ?? (parametros.get("aba") === "rotina" ? "rotina" : "agenda");

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Agenda</h1>

      <Segmentado rotulo="Seção da agenda" opcoes={ABAS} valor={aba} onChange={setEscolhida} cheio />

      {aba === "agenda" ? <AgendaPorPeriodo /> : <RotinaDaSemana />}
    </>
  );
}

function AgendaPorPeriodo() {
  const hoje = hojeIsoBrasilia();
  const [visao, setVisao] = useState<Visao>("semana");
  const [ancora, setAncora] = useState(hoje);

  const { de, ate } = periodo(visao, ancora);
  const { data, isLoading, isError, refetch } = useAgendaDoPortal(de, ate);

  const dias = (data ?? []).filter((d) => d.itens.length > 0);

  return (
    <>
      <Segmentado rotulo="Período" opcoes={VISOES} valor={visao} onChange={setVisao} cheio />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Período anterior"
          onClick={() => setAncora(mover(visao, ancora, -1))}
        >
          <ChevronLeft />
        </Button>
        <p aria-live="polite" className="min-w-0 truncate text-center font-heading text-[16px] font-semibold tracking-[-.02em]">
          {titulo(visao, ancora, hoje)}
        </p>
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Próximo período"
          onClick={() => setAncora(mover(visao, ancora, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {ancora !== hoje && visao === "hoje" && (
        <Button variant="ghost" className="h-11 self-center" onClick={() => setAncora(hoje)}>
          Voltar para hoje
        </Button>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar a agenda." onTentar={() => refetch()} />}

      {data && dias.length === 0 && (
        <VazioDoPortal
          icone={<CalendarDays />}
          titulo={visao === "hoje" ? "Nada marcado para este dia" : "Nada marcado neste período"}
          texto="Eventos, feriados e a rotina da turma aparecem aqui."
        />
      )}

      {dias.map((dia) => (
        <section key={dia.data} aria-label={diaComSemana(dia.data)} className="flex flex-col gap-2">
          {/* No modo "Hoje" o título da navegação já diz o dia; nos outros, cada dia ganha o seu. */}
          {visao !== "hoje" && (
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-semibold text-muted-foreground">
              {capitalizar(diaComSemana(dia.data))}
              {dia.data === hoje && (
                <span className="rounded-md bg-action-soft px-1.5 py-0.5 text-[11px] font-semibold text-action-soft-foreground">
                  Hoje
                </span>
              )}
            </h2>
          )}
          <ul className="flex flex-col gap-2">
            {dia.itens.map((item) => (
              <li key={`${item.origem}-${item.id}`}>
                <LinhaDaAgenda item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function RotinaDaSemana() {
  const { data, isLoading, isError, refetch } = useRotinaDosFilhos();
  const [escolhido, setEscolhido] = useState<number | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError || !data) return <ErroDoPortal texto="Não foi possível carregar a rotina." onTentar={() => refetch()} />;

  if (data.length === 0) {
    return (
      <VazioDoPortal
        icone={<CalendarClock />}
        titulo="Nenhuma rotina por enquanto"
        texto="Quando a escola cadastrar os horários da turma, eles aparecem aqui."
      />
    );
  }

  const filho = data.find((f) => f.studentId === escolhido) ?? data[0];

  return (
    <>
      {data.length > 1 && (
        <div role="group" aria-label="Rotina de qual filho" className="flex flex-wrap gap-1.5">
          {data.map((f) => {
            const ativo = f.studentId === filho.studentId;
            return (
              <button
                key={f.studentId}
                type="button"
                aria-pressed={ativo}
                onClick={() => setEscolhido(f.studentId)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-[13.5px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  ativo ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"
                )}
              >
                {f.nome.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}

      <SemanaDoFilho filho={filho} />
    </>
  );
}

function SemanaDoFilho({ filho }: { filho: RotinaDoFilho }) {
  const hoje = diaDaSemana(hojeIsoBrasilia());
  const itensDe = (dia: number) => filho.semana.find((s) => s.diaDaSemana === dia)?.itens ?? [];

  // Segunda a sexta sempre; sábado e domingo só quando a escola cadastrou algo.
  const dias = [1, 2, 3, 4, 5, 6, 0].filter((d) => (d >= 1 && d <= 5) || itensDe(d).length > 0);
  const vazia = dias.every((d) => itensDe(d).length === 0);

  if (vazia) {
    return (
      <VazioDoPortal
        icone={<CalendarClock />}
        titulo={`Sem rotina para ${filho.nome.split(" ")[0]}`}
        texto="A escola ainda não cadastrou os horários da turma."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filho.turma && <p className="text-[13px] text-muted-foreground">Turma {filho.turma}</p>}

      {dias.map((dia) => {
        const itens = itensDe(dia);
        const nome = capitalizar(DIAS_DA_SEMANA_LONGOS[dia]);
        return (
          <section
            key={dia}
            aria-label={nome}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-card p-3",
              dia === hoje ? "border-action-border" : "border-border"
            )}
          >
            <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold">
              {nome}
              {dia === hoje && (
                <span className="rounded-md bg-action-soft px-1.5 py-0.5 text-[11px] font-semibold text-action-soft-foreground">
                  Hoje
                </span>
              )}
            </h2>

            {itens.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nada marcado.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {itens.map((i, idx) => (
                  <li key={`${i.horaInicio}-${idx}`} className="flex gap-3">
                    <span className="w-24 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                      {faixaDeHorario(i.horaInicio, i.horaFim)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-medium break-words">{i.atividade}</span>
                      {i.descricao && (
                        <span className="block text-[13px] leading-snug break-words whitespace-pre-line text-muted-foreground">
                          {i.descricao}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
