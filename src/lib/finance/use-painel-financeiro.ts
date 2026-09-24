import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

/**
 * Painel do financeiro — fase 3.
 *
 * Uma chamada só traz o painel inteiro: os blocos leem a mesma faixa de meses, e quebrar em
 * cinco requisições faria a tela montar aos pedaços com números que não fecham entre si.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface Indicador {
  rotulo: string;
  valor: number;
  mesAnterior?: number | null;
  anoPassado?: number | null;
  variacao?: number | null;
}

export interface LinhaDoResultado {
  categoriaId?: string | null;
  nome: string;
  tipo: "Receita" | "Despesa";
  valor: number;
  percentual: number;
  contas: LinhaDoResultado[];
}

export interface MesProjetado {
  ano: number;
  mes: number;
  realizado: boolean;
  entradas: number;
  saidas: number;
  resultado: number;
  saldoAcumulado: number;
}

export interface FaixaDeAtraso {
  faixa: string;
  cobrancas: number;
  valor: number;
}

export interface AtrasoPorTurma {
  turmaId?: number | null;
  turma: string;
  alunos: number;
  valor: number;
}

export interface MaiorGasto {
  nome: string;
  valor: number;
  lancamentos: number;
}

export interface AlertaDoPainel {
  codigo: string;
  texto: string;
  gravidade: "info" | "atencao" | "grave";
  link?: string | null;
}

export interface PainelFinanceiro {
  ano: number;
  mes: number;
  recebido: Indicador;
  pago: Indicador;
  resultado: Indicador;
  saldoEmCaixa: number;
  emAtraso: number;
  cobrancasEmAtraso: number;
  ticketMedio: number;
  alunosComPlano: number;
  receitas: LinhaDoResultado[];
  despesas: LinhaDoResultado[];
  projecao: MesProjetado[];
  aging: FaixaDeAtraso[];
  atrasoPorTurma: AtrasoPorTurma[];
  maioresGastos: MaiorGasto[];
  alertas: AlertaDoPainel[];
}

export function usePainelFinanceiro(ano: number, mes: number) {
  return useQuery({
    queryKey: ["finance", "painel", ano, mes],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${API}/api/finance/painel?ano=${ano}&mes=${mes}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error((corpo as { message?: string } | null)?.message ?? "Não foi possível carregar o painel.");
      }
      return (await res.json()) as PainelFinanceiro;
    },
  });
}
