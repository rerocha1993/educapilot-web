import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { responsavelJson } from "@/lib/reception/api-responsavel";
import { consulta } from "./api";
import { registros, fotosDoDiario, type FotoDoDiario, type RegistroDoDiario } from "./use-diario";

/**
 * Diário do aluno no portal da família (2026-10) — /api/Responsavel/diario.
 *
 * Só o que a escola publicou e só dos filhos do responsável: o servidor responde 404 para qualquer
 * outro caso. O dia e a lista vêm de uma consulta por data; os dias para voltar no histórico, de
 * outra, por filho. Marcar como lido é automático ao abrir o diário (`useMarcarComoLido`).
 *
 * Os registros de Saúde do próprio filho vêm junto e ficam só nesta tela: nada aqui vai para
 * armazenamento do navegador nem para URL.
 */

const CHAVE = ["responsavel", "portal", "diario"] as const;

export interface DiarioDaFamilia {
  id: string;
  studentId: number;
  aluno: string;
  /** yyyy-MM-dd */
  data: string;
  /** Instante UTC. */
  publicadoEm: string | null;
  /** A escola editou depois de publicar. */
  atualizado: boolean;
  recadoGeral: string | null;
  lido: boolean;
  registros: RegistroDoDiario[];
  fotos: FotoDoDiario[];
}

export interface FilhoDoDiario {
  studentId: number;
  nome: string;
  turma: string;
  /** Nulo = a escola não publicou o diário deste dia. */
  diario: DiarioDaFamilia | null;
}

export interface DiasDoDiario {
  studentId: number;
  de: string;
  ate: string;
  dias: { data: string; diarioId: string; lido: boolean; atualizado: boolean }[];
}

type DiarioCru = Partial<Omit<DiarioDaFamilia, "registros" | "fotos">> & {
  registros?: Parameters<typeof registros>[0];
  fotos?: Parameters<typeof fotosDoDiario>[0];
};

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

function diario(d: DiarioCru): DiarioDaFamilia {
  return {
    id: d.id ?? "",
    studentId: d.studentId ?? 0,
    aluno: d.aluno ?? "",
    data: dia(d.data),
    publicadoEm: d.publicadoEm ?? null,
    atualizado: d.atualizado ?? false,
    recadoGeral: d.recadoGeral?.trim() ? d.recadoGeral : null,
    lido: d.lido ?? false,
    registros: registros(d.registros),
    fotos: fotosDoDiario(d.fotos),
  };
}

/** O diário do dia de cada filho. `studentId` restringe a um filho. */
export function useDiariosDoPortal(data: string, ativo = true) {
  return useQuery({
    queryKey: [...CHAVE, "dia", data],
    enabled: ativo && !!data,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await responsavelJson<{
        data?: string;
        filhos?: { studentId?: number; nome?: string; turma?: string; diario?: DiarioCru | null }[];
      } | null>(`/diario${consulta({ data })}`, {}, "Não foi possível carregar o diário.");
      return {
        data: dia(r?.data) || data,
        filhos: (r?.filhos ?? []).map(
          (f): FilhoDoDiario => ({
            studentId: f.studentId ?? 0,
            nome: f.nome ?? "",
            turma: f.turma ?? "",
            diario: f.diario ? diario(f.diario) : null,
          })
        ),
      };
    },
  });
}

/** Os dias com diário publicado de um filho, para a faixa de histórico. */
export function useDiasDoDiario(studentId: number | null, de: string, ate: string) {
  return useQuery({
    queryKey: [...CHAVE, "dias", studentId, de, ate],
    enabled: studentId !== null && !!de && !!ate,
    staleTime: 60_000,
    queryFn: async (): Promise<DiasDoDiario> => {
      const r = await responsavelJson<Partial<DiasDoDiario> | null>(
        `/diario/filhos/${studentId}/dias${consulta({ de, ate })}`,
        {},
        "Não foi possível carregar os dias anteriores."
      );
      return {
        studentId: studentId ?? 0,
        de: dia(r?.de) || de,
        ate: dia(r?.ate) || ate,
        dias: (r?.dias ?? []).map((d) => ({
          data: dia(d.data),
          diarioId: d.diarioId ?? "",
          lido: d.lido ?? false,
          atualizado: d.atualizado ?? false,
        })),
      };
    },
  });
}

/** Marca o diário como lido (idempotente) e atualiza as listas. */
export function useMarcarComoLido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      responsavelJson<{ lida?: boolean }>(`/diario/${id}/ler`, { method: "POST" }, "Não foi possível registrar a leitura."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}
