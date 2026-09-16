import { useMutation, useQuery } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type SituacaoDaMatricula =
  | "rematriculado"
  | "rematricula-pendente"
  | "nao-rematriculado"
  | "matricula-nova"
  | "matricula-nova-pendente"
  | "rematricula-sem-cadastro";

export interface LinhaMatriculaRematricula {
  studentId?: number | null;
  aluno: string;
  dataNascimento?: string | null;
  turmaAtual?: string | null;
  situacao: SituacaoDaMatricula;
  situacaoDescricao: string;
  turmaProximoAno?: string | null;
  statusEnvio?: string | null;
  enviadoEm?: string | null;
  formulario?: string | null;
}

export interface RelatorioMatriculas {
  anoVigente: number;
  proximoAno: number;
  alunosAtivos: number;
  rematriculados: number;
  rematriculasPendentes: number;
  naoRematriculados: number;
  matriculasNovas: number;
  matriculasNovasPendentes: number;
  rematriculasSemCadastro: number;
  linhas: LinhaMatriculaRematricula[];
}

// fetch cru: rota nova, fora dos tipos gerados, e a planilha é binária.
async function chamar(caminho: string): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${baseUrl}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.replace("/login?expirada=1");
  }
  return res;
}

export function useRelatorioMatriculas() {
  return useQuery({
    queryKey: ["relatorios", "matriculas-rematriculas"],
    queryFn: async () => {
      const res = await chamar("/api/Flow/relatorios/matriculas-rematriculas");
      if (!res.ok) throw new Error("Não foi possível gerar o relatório.");
      return (await res.json()) as RelatorioMatriculas;
    },
  });
}

export function useBaixarRelatorioMatriculas() {
  return useMutation({
    mutationFn: async () => {
      const res = await chamar("/api/Flow/relatorios/matriculas-rematriculas/excel");
      if (!res.ok) throw new Error("Não foi possível gerar a planilha.");
      const url = window.URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "matriculas-x-rematriculas.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}
