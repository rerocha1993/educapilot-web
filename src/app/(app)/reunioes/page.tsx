"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, ClipboardList, MessageSquareText, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { DemandasDaReuniao } from "@/components/tasks/demandas-da-reuniao";
import { PautaDaSemana } from "@/components/tasks/pauta-da-semana";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { cn } from "@/lib/utils";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useMeetings,
  useMeetingReport,
  useSaveMeeting,
  type MeetingDto,
} from "@/lib/tasks/use-meetings";
import { useWeeklyPlans } from "@/lib/tasks/use-weekly-plans";
import { UNJUSTIFIED_REASON } from "@/lib/tasks/use-absences";
import { dataLocalIso } from "@/lib/format/date";

// Reescrito (2026-09, feedback do cliente) — "a tela de reuniões, essa tela é para
// ser por turma, nela ao selecionar a turma a diretora clica na semana, quando ela
// clica na semana vai trazer relatório de faltas, relatório de ocorrências e de
// observação semana, um espaço para a diretora descrever como foi a reunião [...]
// no final tudo é salvo para ser gerado um relatório pela gestão, pode ser com
// indicadores resumidos com explosão de descrição e resumos". A tela antiga era só
// "abrir/fechar reunião + escrever ata", sem nenhuma turma→semana→dados. Ver
// use-meetings.ts pro raciocínio sobre as APIs (já existiam quase prontas).
//
// Redesenhado (2026-10, auditoria de telas): quatro cartões de 440px quase vazios empurravam o
// registro da reunião para baixo da dobra. Agora o trabalho (discussão, resumo, demandas) fica à
// esquerda e o que se consulta (faltas, ocorrências, observação, planejamento) vira a "Pauta da
// semana", em abas, à direita; uma faixa de resumo mostra a semana num relance.

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function recentWeeks(count: number) {
  const thisMonday = mondayOf(new Date());
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  });
}

function formatShort(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Guia: situação do dado vira variante de Badge (pendente / concluída).
const STATUS_BADGE_VARIANT = {
  Aberto: "pending",
  Finalizado: "success",
} as const;

function statusVariant(status: string) {
  return STATUS_BADGE_VARIANT[status as keyof typeof STATUS_BADGE_VARIANT] ?? "secondary";
}

export default function ReunioesPage() {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<number | null>(null);

  useEffect(() => {
    if (classId === null && classes && classes.length > 0) {
      setClassId(classes[0].id ?? null);
    }
  }, [classes, classId]);

  const weeks = useMemo(() => recentWeeks(8), []);
  const [weekIndex, setWeekIndex] = useState(0);
  const week = weeks[weekIndex];

  const { data: meetings } = useMeetings(classId);
  const currentMeeting = meetings?.find((m) => new Date(m.createdAt).toDateString() === week.start.toDateString()) ?? null;

  const { data: report, isLoading: reportLoading } = useMeetingReport(classId, week.start, week.end);
  const saveMeeting = useSaveMeeting();
  const queryClient = useQueryClient();

  // Novo (2026-09, feedback do cliente) — "na reunião pode trazer o planejamento das
  // professoras pra saber o que foi trabalhado": mesmo endpoint já usado em
  // /planejamento-semanal, filtrado pela semana selecionada aqui.
  const { data: weeklyPlans, isLoading: plansLoading } = useWeeklyPlans(classId, week.start, week.end);

  const [discussion, setDiscussion] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    setDiscussion(currentMeeting?.discussion ?? "");
    setSummary(currentMeeting?.summary ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMeeting?.id, weekIndex, classId]);

  // "somente de quem faltou mesmo" — cada item de s.absences já é uma falta real
  // (o backend só inclui quem tem Absence vinculada, ver StudentQueryService), não
  // filtra mais nada aqui.
  const absences = (report?.students ?? [])
    .filter((s) => s.absences.length > 0)
    .flatMap((s) => s.absences.map((a) => ({ ...a, studentName: s.fullName })));
  const occurrences = (report?.students ?? []).flatMap((s) =>
    s.occurrences.map((o) => ({ ...o, studentName: s.fullName }))
  );
  const weeklyReports = report?.weeklyReports ?? [];

  // Devolve o id da reunião salva: as demandas só viram cartão penduradas nela, e na primeira
  // vez da semana a reunião nasce dentro do próprio "Salvar demandas".
  async function handleSave(status: "Aberto" | "Finalizado"): Promise<number | null> {
    if (classId === null) return null;
    try {
      await saveMeeting.mutateAsync({
        id: currentMeeting?.id,
        classId,
        createdAt: dataLocalIso(week.start),
        status,
        discussion,
        summary: summary || null,
      });
      toast.success(status === "Finalizado" ? "Reunião finalizada." : "Reunião salva.");

      // O POST/PUT de Meeting só confirma, não devolve a entidade — então relê a lista (a
      // mutação já a invalidou) e procura a reunião desta turma nesta semana. `currentMeeting`
      // ainda é o de antes do salvamento neste render, e seria nulo justamente na criação.
      await queryClient.refetchQueries({ queryKey: ["meetings"] });
      const todas = queryClient.getQueryData<MeetingDto[]>(["meetings"]) ?? [];
      const salva = todas.find(
        (m) =>
          m.classId === classId &&
          new Date(m.createdAt).toDateString() === week.start.toDateString()
      );
      return salva?.id ?? currentMeeting?.id ?? null;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar reunião.");
      return null;
    }
  }

  const selectedClass = classes?.find((c) => c.id === classId);

  // Faixa de resumo: o que a semana trouxe, num relance. Só ganha cor o que pede atenção (falta,
  // ocorrência) ou o que está feito; "nada" fica neutro, para não gritar numa semana tranquila.
  const faltasSemJustificativa = absences.filter((a) => !a.reason || a.reason === UNJUSTIFIED_REASON).length;
  const temPlanejamento = (weeklyPlans?.length ?? 0) > 0;
  const resumo: { chave: string; icone: ReactNode; texto: string; tom: "atencao" | "feito" | "neutro" }[] = [
    {
      chave: "faltas",
      icone: <UserX aria-hidden />,
      texto:
        absences.length === 0
          ? "Sem faltas"
          : `${absences.length} ${absences.length === 1 ? "falta" : "faltas"}` +
            (faltasSemJustificativa > 0 ? ` (${faltasSemJustificativa} sem justificativa)` : ""),
      tom: absences.length > 0 ? "atencao" : "neutro",
    },
    {
      chave: "ocorrencias",
      icone: <AlertTriangle aria-hidden />,
      texto:
        occurrences.length === 0
          ? "Sem ocorrências"
          : `${occurrences.length} ${occurrences.length === 1 ? "ocorrência" : "ocorrências"}`,
      tom: occurrences.length > 0 ? "atencao" : "neutro",
    },
    {
      chave: "observacao",
      icone: <MessageSquareText aria-hidden />,
      texto: weeklyReports.length > 0 ? "Observação enviada" : "Observação não enviada",
      tom: weeklyReports.length > 0 ? "feito" : "neutro",
    },
    {
      chave: "planejamento",
      icone: <ClipboardList aria-hidden />,
      texto: temPlanejamento ? "Planejamento feito" : "Sem planejamento",
      tom: temPlanejamento ? "feito" : "neutro",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Reuniões"
        apoio="Escolha a turma e a semana, consulte a pauta e registre a reunião."
        acoes={
          <Select value={classId?.toString() ?? ""} onValueChange={(v) => v && setClassId(Number(v))}>
            <SelectTrigger className="w-full md:w-44" aria-label="Turma">
              <SelectValue placeholder="Turma">{() => selectedClass?.className ?? "Turma"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* "a diretora clica na semana" — chips das últimas 8 semanas (segunda a domingo), numa só
          linha que rola de lado: oito chips quebrados em várias linhas comiam o alto da tela. */}
      <div
        role="group"
        aria-label="Semana da reunião"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {weeks.map((w, i) => {
          const hasMeeting = meetings?.some((m) => new Date(m.createdAt).toDateString() === w.start.toDateString());
          return (
            <button
              key={i}
              type="button"
              onClick={() => setWeekIndex(i)}
              aria-pressed={weekIndex === i}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2.5 font-numeric text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:py-1.5",
                weekIndex === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-foreground hover:bg-accent"
              )}
            >
              {formatShort(w.start)} – {formatShort(w.end)}
              {hasMeeting && (
                <span
                  role="img"
                  aria-label="com reunião registrada"
                  className={cn("size-1.5 rounded-full", weekIndex === i ? "bg-primary-foreground" : "bg-primary")}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        aria-label="Resumo da semana"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-3.5 py-2.5"
      >
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Semana de <span className="font-numeric">{formatShort(week.start)}</span> a{" "}
            <span className="font-numeric">{formatShort(week.end)}</span>
          </span>
          {currentMeeting && <Badge variant={statusVariant(currentMeeting.status)}>{currentMeeting.status}</Badge>}
        </span>
        <ul className="flex flex-wrap items-center gap-1.5">
          {resumo.map((r) => (
            <li
              key={r.chave}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium [&_svg]:size-3.5",
                r.tom === "atencao" && "bg-action-soft text-action-soft-foreground",
                r.tom === "feito" && "bg-success-soft text-success-soft-foreground",
                r.tom === "neutro" && "bg-muted text-muted-foreground"
              )}
            >
              {r.icone}
              {(reportLoading && r.chave !== "planejamento") || (plansLoading && r.chave === "planejamento")
                ? "..."
                : r.texto}
            </li>
          ))}
        </ul>
      </div>

      {/* Duas colunas em tela larga: o trabalho (≈60%) à esquerda e a pauta (≈40%) à direita, fixa
          no alto com rolagem interna. Abaixo de lg tudo empilha e a pauta vem antes do formulário:
          a diretora consulta, depois escreve. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PautaDaSemana
          className="lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1"
          faltas={absences}
          ocorrencias={occurrences}
          observacoes={weeklyReports}
          planejamentos={weeklyPlans ?? []}
          carregandoRelatorio={reportLoading}
          carregandoPlanejamento={plansLoading}
        />

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <section aria-label="Como foi a reunião" className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 font-heading text-[15.5px] font-semibold">Como foi a reunião</h2>
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <label
                    htmlFor="reuniao-discussao"
                    className="mb-1 block text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground"
                  >
                    Discussão
                  </label>
                  <Textarea
                    id="reuniao-discussao"
                    value={discussion}
                    onChange={(e) => setDiscussion(e.target.value)}
                    rows={6}
                    placeholder="O que foi discutido na reunião com a professora..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="reuniao-resumo"
                    className="mb-1 block text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground"
                  >
                    Resumo (aparece no relatório de gestão)
                  </label>
                  <Textarea
                    id="reuniao-resumo"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={6}
                    placeholder="Resumo curto pra quem só quer o panorama..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleSave("Aberto")} disabled={saveMeeting.isPending}>
                  Salvar rascunho
                </Button>
                {/* Único botão laranja da tela: é a decisão a tomar aqui (o rascunho
                    fica secundário, em outline). */}
                <Button
                  variant="action"
                  onClick={() => handleSave("Finalizado")}
                  disabled={saveMeeting.isPending || !discussion.trim()}
                >
                  Finalizar reunião
                </Button>
              </div>
            </div>
          </section>

          {/* "a diretora registra as demandas combinadas na reunião e, ao salvar, elas viram
              cartões no quadro de quem vai fazer" (2026-09). Vem depois de "Como foi a reunião"
              porque é o desfecho da conversa, não o começo dela. `key` por turma+semana: o
              rascunho é do encontro que está aberto na tela, e trocar de semana com demandas
              digitadas as mandaria para a reunião errada. */}
          <DemandasDaReuniao
            key={`${classId}-${weekIndex}`}
            reuniaoId={currentMeeting?.id ?? null}
            turmaId={classId}
            onSalvarReuniao={() => handleSave("Aberto")}
          />
        </div>
      </div>

      <MeetingHistory classId={classId} meetings={meetings ?? []} />
    </div>
  );
}

// "no final tudo é salvo para ser gerado um relatório pela gestão, pode ser com
// indicadores resumidos com explosão de descrição e resumos": reuniões já registradas da turma
// em linha do tempo compacta, em duas colunas. Os indicadores da semana são calculados sob
// demanda ao abrir, pra não buscar tudo de uma vez; a reunião aberta ocupa a largura toda.
function MeetingHistory({ classId, meetings }: { classId: number | null; meetings: MeetingDto[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expanded = meetings.find((m) => m.id === expandedId) ?? null;
  const expandedWeekStart = expanded ? mondayOf(new Date(expanded.createdAt)) : new Date();
  const expandedWeekEnd = useMemo(() => {
    const d = new Date(expandedWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [expandedWeekStart]);

  const { data: expandedReport } = useMeetingReport(
    expanded ? classId : null,
    expandedWeekStart,
    expandedWeekEnd
  );

  const sorted = meetings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (classId === null) return null;

  return (
    <section aria-label="Histórico de reuniões" className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-heading text-[15.5px] font-semibold">
          Histórico de reuniões
          {sorted.length > 0 && (
            <span className="ml-1.5 font-numeric text-xs font-normal text-muted-foreground">{sorted.length}</span>
          )}
        </h2>
        <p className="text-[12.5px] text-muted-foreground">Relatório de gestão — indicadores resumidos por semana.</p>
      </div>

      {sorted.length === 0 && (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          Nenhuma reunião registrada ainda.
        </p>
      )}

      <ol className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {sorted.map((m) => {
          const isExpanded = expandedId === m.id;
          const weekStart = mondayOf(new Date(m.createdAt));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const resumoCurto = m.summary?.trim() || m.discussion?.trim() || "";
          return (
            <li key={m.id} className={cn("rounded-lg border border-border", isExpanded && "md:col-span-2")}>
              <div className="flex items-start gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-numeric text-sm font-medium">
                      {formatShort(weekStart)} – {formatShort(weekEnd)}
                    </span>
                    <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                  </div>
                  {!isExpanded && (
                    <p className="mt-1 line-clamp-2 break-words text-[13px] text-muted-foreground">
                      {resumoCurto || "Sem resumo registrado."}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="shrink-0"
                >
                  {isExpanded ? "Recolher" : "Abrir"}
                </Button>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-3 border-t border-border p-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-numeric text-xs text-muted-foreground">
                    <span>{(expandedReport?.students ?? []).flatMap((s) => s.absences).length} faltas</span>
                    <span>{(expandedReport?.students ?? []).flatMap((s) => s.occurrences).length} ocorrências</span>
                    <span>{(expandedReport?.weeklyReports ?? []).length} observações</span>
                  </div>
                  {m.summary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Resumo</p>
                      <p className="whitespace-pre-line break-words text-sm">{m.summary}</p>
                    </div>
                  )}
                  {m.discussion && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Discussão</p>
                      <p className="whitespace-pre-line break-words text-sm">{m.discussion}</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
