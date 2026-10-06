import { useQuery } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Aniversariantes da escola — GET /api/Painel/aniversariantes?dias=N (N de 1 a 92).
 *
 * O servidor já recorta pela permissão e pelas turmas da professora: lista que a pessoa não pode
 * ver chega vazia. Por isso a tela não tenta adivinhar permissão a partir do que veio — quem decide
 * o que mostrar é a rota visível (ver inicio/page.tsx), e o vazio aqui só quer dizer "ninguém".
 *
 * Todas as datas são só-data ("yyyy-MM-dd") e ficam como texto: passar por Date mudaria o dia
 * conforme o fuso.
 *
 * Tipado à mão como os demais hooks do painel.
 */

export interface AlunoAniversariante {
  studentId: number;
  nome: string;
  turma: string | null;
  classId: number | null;
  dataDeNascimento: string;
  proximoAniversario: string;
  idadeQueFaz: number;
  /** 0 = hoje. */
  diasRestantes: number;
}

export interface ResponsavelAniversariante {
  guardianId: string;
  nome: string;
  parentesco: string | null;
  /** Nomes dos alunos de quem a pessoa é responsável. */
  alunos: string[];
  dataDeNascimento: string;
  proximoAniversario: string;
  diasRestantes: number;
}

/** Reservado para o RH; o servidor devolve vazio por enquanto e a tela ainda não o mostra. */
export interface MembroDaEquipeAniversariante {
  nome: string;
  proximoAniversario: string;
  diasRestantes: number;
}

export interface Aniversariantes {
  inicio: string;
  fim: string;
  alunos: AlunoAniversariante[];
  responsaveis: ResponsavelAniversariante[];
  equipe: MembroDaEquipeAniversariante[];
}

export function useAniversariantes(dias: number) {
  return useQuery({
    queryKey: ["aniversariantes", dias],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/Painel/aniversariantes?dias=${dias}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.status === 401 && typeof window !== "undefined") {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login?expirada=1");
        }
      }

      if (!res.ok) throw new Error("Não foi possível carregar os aniversariantes.");

      const bruto = (await res.json()) as Partial<Aniversariantes> | null;
      return {
        inicio: bruto?.inicio ?? "",
        fim: bruto?.fim ?? "",
        alunos: bruto?.alunos ?? [],
        responsaveis: bruto?.responsaveis ?? [],
        equipe: bruto?.equipe ?? [],
      } satisfies Aniversariantes;
    },
  });
}
