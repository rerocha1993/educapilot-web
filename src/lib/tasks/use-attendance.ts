import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// P = presente, F = falta, A = atraso — ver SharedKernel.../Attendance.cs. Só "F"
// aciona a criação automática de um registro de Absence no backend (com motivo
// padrão); "A" (atraso) foi adicionado nesta sessão como convenção de aplicação,
// sem migração — o backend já aceita qualquer string em Status.
export type AttendanceStatus = "P" | "F" | "A";

export interface AttendanceDto {
  id: number;
  classId: number;
  attendanceDate: string;
  studentId: number;
  status: AttendanceStatus;
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useAttendanceByClass(classId: number | null, date: Date) {
  const dateParam = toDateParam(date);
  return useQuery({
    queryKey: ["attendance", classId, dateParam],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Attendance/class/{classId}/date/{date}", {
        params: { path: { classId: classId!, date: dateParam } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar a chamada.");
      return (data ?? []) as unknown as AttendanceDto[];
    },
    enabled: classId !== null,
  });
}

export interface SaveAttendanceRow {
  id?: number; // presente = atualizar (PUT), ausente = criar (POST)
  classId: number;
  studentId: number;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

// Sem endpoint de upsert em lote: POST /api/Attendance/list só cria (duplicaria
// registro se a turma já tiver chamada feita nessa data). Por isso salva linha a
// linha — PUT pra quem já tem registro, POST pra quem não tem — em paralelo.
export function useSaveAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: SaveAttendanceRow[]) => {
      if (rows.length === 0) return;
      await Promise.all(
        rows.map(async (row) => {
          // POST único (diferente do bulk /list) exige um Absence explícito quando
          // Status = "F" — ver AttendanceController.Create. Motivo real se ajusta
          // depois na tela de Faltas (R2), via PUT /api/Absence.
          const absence = row.status === "F" ? { reason: "Não informado" } : undefined;

          if (row.id) {
            const result = await tasksApi.PUT("/api/Attendance/{id}", {
              params: { path: { id: row.id } },
              body: {
                id: row.id,
                classId: row.classId,
                studentId: row.studentId,
                attendanceDate: row.attendanceDate,
                status: row.status,
                absence,
              },
            });
            unwrapApiResponse(result, "Não foi possível salvar a chamada.");
          } else {
            const result = await tasksApi.POST("/api/Attendance", {
              body: {
                classId: row.classId,
                studentId: row.studentId,
                attendanceDate: row.attendanceDate,
                status: row.status,
                absence,
              },
            });
            unwrapApiResponse(result, "Não foi possível salvar a chamada.");
          }
        })
      );
    },
    onSuccess: (_data, rows) => {
      if (rows.length === 0) return;
      const { classId, attendanceDate } = rows[0];
      queryClient.invalidateQueries({ queryKey: ["attendance", classId, attendanceDate] });
      // Correção (2026-09, feedback do cliente) — "na tela de faltas pendente da
      // turma, não aparece os que estão com falta pendente de justificativa": marcar
      // "Falta" cria um Absence no backend (ver comentário acima), mas só a query da
      // própria chamada era invalidada — o painel "Faltas pendentes da turma" (que lê
      // useAbsences(), chave "absences") ficava com cache velho até um reload manual
      // da página, mesmo com o dado já salvo no banco.
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });
}
