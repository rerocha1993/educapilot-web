"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useAttendanceByClass,
  useSaveAttendance,
  type AttendanceStatus,
  type SaveAttendanceRow,
} from "@/lib/tasks/use-attendance";
import { useAbsences, useJustifyAbsence, UNJUSTIFIED_REASON } from "@/lib/tasks/use-absences";
import { cn } from "@/lib/utils";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Presente",
  F: "Falta",
  A: "Atraso",
};

// Guia: a opção escolhida do segmentado é tingida pela situação do dado
// (verde presente, vermelho falta, laranja atraso).
const STATUS_SELECTED: Record<AttendanceStatus, string> = {
  P: "bg-success-soft text-success-soft-foreground",
  F: "bg-destructive-soft text-destructive-soft-foreground",
  A: "bg-action-soft text-action-soft-foreground",
};

// Iniciais do aluno pro avatar da linha (modelo "Rotina · Chamada").
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Reestruturado (2026-09, feedback do cliente): "essa aba chamada pode dividir tela
// com a faltas [...] pensar no mobile tbm". Duas mudanças:
// 1) Layout virou split (grid) com um painel de "Faltas pendentes da turma" ao lado
//    — resolve falta sem sair da tela de chamada. A rota /faltas e a aba própria
//    foram removidas (2026-09, feedback do cliente): "a aba faltas ainda esta na
//    tela, precisa tirar pq vc colcoou ele nas chamadas" — o painel aqui já cobre o
//    caso de uso, não faz sentido manter as duas telas.
// 2) A barra fixa de salvar tinha "left-56" fixo (largura da sidebar desktop) — quebrava
//    completamente no mobile (não tem sidebar lá). Virou responsivo.

export default function ChamadaPage() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState(hojeIsoBrasilia());

  useEffect(() => {
    if (selectedClassId === null && classes && classes.length > 0) {
      setSelectedClassId(classes[0].id ?? null);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes?.find((c) => c.id === selectedClassId);
  const roster = useMemo(() => {
    const students = (selectedClass?.students ?? []).filter(
      (s): s is typeof s & { id: number; fullName: string } => s.id != null && !!s.fullName
    );
    return [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [selectedClass]);

  const date = useMemo(() => new Date(dateStr + "T00:00:00"), [dateStr]);
  const { data: existingAttendance, isLoading: attendanceLoading, isError } =
    useAttendanceByClass(selectedClassId, date);
  const saveAttendance = useSaveAttendance();

  // studentId -> { id do registro existente (se houver), status escolhido }
  const [marks, setMarks] = useState<Record<number, { id?: number; status: AttendanceStatus | null }>>(
    {}
  );

  useEffect(() => {
    const next: Record<number, { id?: number; status: AttendanceStatus | null }> = {};
    for (const student of roster) {
      const existing = existingAttendance?.find((a) => a.studentId === student.id);
      next[student.id] = { id: existing?.id, status: existing?.status ?? null };
    }
    setMarks(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, dateStr, existingAttendance]);

  const presentCount = Object.values(marks).filter((m) => m.status === "P").length;

  // Painel "Faltas pendentes da turma" — GET /api/Absence não filtra por turma no
  // backend, então filtra aqui. Sem filtro de data: mostra tudo que ainda não foi
  // justificado pra essa turma, não só o dia sendo chamado agora (é raro justificar
  // no mesmo dia da falta).
  const { data: absences } = useAbsences();
  const pendingAbsences = useMemo(
    () =>
      (absences ?? []).filter(
        (a) => a.attendance?.classId === selectedClassId && (!a.reason || a.reason === UNJUSTIFIED_REASON)
      ),
    [absences, selectedClassId]
  );
  const justify = useJustifyAbsence();
  const [justifyingId, setJustifyingId] = useState<number | null>(null);
  const [justifyReason, setJustifyReason] = useState("");

  async function handleJustify(absenceId: number, attendanceId: number) {
    if (!justifyReason.trim()) return;
    try {
      await justify.mutateAsync({ id: absenceId, attendanceId, reason: justifyReason.trim() });
      toast.success("Justificativa registrada.");
      setJustifyingId(null);
      setJustifyReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    }
  }

  function setStatus(studentId: number, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function markAllPresent() {
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of roster) {
        next[student.id] = { ...next[student.id], status: "P" };
      }
      return next;
    });
  }

  async function handleSave() {
    if (selectedClassId === null) return;
    const rows: SaveAttendanceRow[] = roster
      .filter((s) => marks[s.id]?.status)
      .map((s) => ({
        id: marks[s.id]?.id,
        classId: selectedClassId,
        studentId: s.id,
        attendanceDate: dateStr,
        status: marks[s.id]!.status as AttendanceStatus,
      }));

    if (rows.length === 0) {
      toast.error("Marque a presença de pelo menos um aluno.");
      return;
    }

    try {
      await saveAttendance.mutateAsync(rows);
      toast.success("Chamada salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a chamada.");
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo={`Chamada${selectedClass ? ` · ${selectedClass.className}` : ""}`}
        apoio={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              <span className="font-numeric">{roster.length}</span> alunos
            </span>
            <span className="text-border">·</span>
            <Badge variant="success">
              <span className="font-numeric">{presentCount}</span> presentes
            </Badge>
          </span>
        }
        acoes={
          <div className="grid w-full grid-cols-2 items-end gap-2 md:flex md:w-auto">
            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Turma
              </span>
              <Select
                value={selectedClassId?.toString() ?? ""}
                onValueChange={(v) => v && setSelectedClassId(Number(v))}
              >
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Selecione">
                    {() => selectedClass?.className ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Data
              </span>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-10 w-full font-numeric md:h-9 md:w-40"
              />
            </div>

            {/* Único botão laranja da tela: é a decisão a tomar aqui (o salvar é
                estrutural, fica roxo na barra fixa). */}
            <Button
              variant="action"
              className="col-span-2"
              onClick={markAllPresent}
              disabled={roster.length === 0}
            >
              Marcar todos presentes
            </Button>
          </div>
        }
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a chamada desta turma/data.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {!classesLoading && !attendanceLoading && roster.length === 0 ? (
          // Sem botão: a ação (escolher turma) já está no cabeçalho.
          <EstadoVazio
            icone={<Users />}
            titulo="Nenhum aluno para chamar"
            texto={selectedClassId === null ? "Selecione uma turma." : "Turma sem alunos."}
          />
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            {/* No celular cada aluno vira um bloco (nome em cima, presença embaixo com os
                três botões dividindo a largura): lado a lado o nome ficava espremido. */}
            <table className="w-full text-sm md:min-w-[420px]">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Presença
                  </th>
                </tr>
              </thead>
              <tbody>
                {(classesLoading || attendanceLoading) &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3" colSpan={2}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))}

                {roster.map((student) => {
                  const status = marks[student.id]?.status ?? null;
                  return (
                    <tr
                      key={student.id}
                      className="flex flex-col gap-2 border-b border-border px-3 py-2.5 last:border-0 md:table-row md:p-0"
                    >
                      <td className="md:px-4 md:py-2.5">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                            {iniciais(student.fullName)}
                          </span>
                          <span className="min-w-0 break-words font-medium">{student.fullName}</span>
                        </span>
                      </td>
                      <td className="md:h-11 md:px-4 md:py-2 md:text-right">
                        <div className="grid grid-cols-3 gap-1 rounded-[9px] bg-muted p-[3px] md:inline-grid">
                          {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatus(student.id, s)}
                              className={cn(
                                "rounded-[7px] px-3 py-3 text-[12.5px] font-semibold transition-colors md:py-1.5",
                                status === s
                                  ? STATUS_SELECTED[s]
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Novo (2026-09, feedback do cliente) — "essa aba chamada pode dividir tela
            com a faltas": painel de faltas pendentes da turma selecionada, com
            justificativa inline, sem precisar sair da chamada. A rota /faltas e a
            aba própria foram removidas — este painel passou a ser o único lugar
            pra justificar falta. */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-[15.5px] font-semibold">Faltas pendentes da turma</h2>
          <p className="mb-3 mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
            Justifique sem sair da chamada.
          </p>

          {selectedClassId === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Selecione uma turma.</p>
          ) : pendingAbsences.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma falta pendente de justificativa.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingAbsences.map((a) => (
                <div key={a.id} className="rounded-[11px] border border-muted p-3">
                  <div className="mb-1 flex items-center gap-2.5">
                    {/* Barra laranja do modelo: marca a pendência (decisão a tomar). */}
                    <span className="h-7 w-[7px] shrink-0 rounded bg-action-brand" />
                    <span className="min-w-0 flex-1 break-words text-[13.5px] font-semibold">
                      {a.attendance?.student?.fullName ?? `Aluno #${a.attendance?.studentId}`}
                    </span>
                    <span className="shrink-0 font-numeric text-[11.5px] text-muted-foreground">
                      {formatarSoData(a.attendanceDate)}
                    </span>
                  </div>

                  {justifyingId === a.id ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={justifyReason}
                        onChange={(e) => setJustifyReason(e.target.value)}
                        rows={2}
                        placeholder="Motivo..."
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setJustifyingId(null);
                            setJustifyReason("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleJustify(a.id, a.attendanceId)}
                          disabled={justify.isPending || !justifyReason.trim()}
                        >
                          Registrar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setJustifyingId(a.id)}>
                      Justificar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chegada (horário) e Observação por aluno fazem parte do wireframe R1, mas o
          backend não tem esses campos em Attendance ainda — ver
          design/handoff/README.md e SharedKernel/.../Attendance.cs. */}
      <p className="text-xs text-muted-foreground">
        Horário de chegada e observação por aluno ainda não são suportados pelo
        backend — próxima etapa.
      </p>

      {/* No celular a barra flutua acima das abas; no computador ela gruda no fim do conteúdo, e
          não na janela — assim acompanha o menu lateral recolhido ou expandido sem largura fixa. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center justify-between border-t border-border bg-background/90 px-4 py-3 backdrop-blur-[10px] md:sticky md:inset-x-auto md:-mx-6 md:bottom-0 md:px-6">
        <span className="text-sm text-muted-foreground">
          <span className="font-numeric">{roster.length}</span> alunos ·{" "}
          <strong className="font-semibold text-foreground">
            <span className="font-numeric">{presentCount}</span> presentes
          </strong>
        </span>
        <Button onClick={handleSave} disabled={saveAttendance.isPending || roster.length === 0}>
          {saveAttendance.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
