import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recibosJson } from "./recibos-api";

/**
 * Recibos (2026-10): recibo de pagamento para o responsável, numerado por ano, em PDF —
 * /api/Recibos, área `recibos` do Financeiro. Tipado à mão, com fetch cru (ver recibos-api.ts).
 *
 * Datas são texto: "yyyy-MM-dd" no que é só data (pagamento) e instante ISO no que é momento
 * (emissão, envio). Campos nulos não vêm no JSON, por isso os opcionais são `?`.
 */

const CHAVE = "recibos";

export const FORMAS_DE_PAGAMENTO = [
  "Dinheiro",
  "Pix",
  "CartaoDeCredito",
  "CartaoDeDebito",
  "Boleto",
  "Transferencia",
  "Outro",
] as const;
export type FormaDePagamento = (typeof FORMAS_DE_PAGAMENTO)[number];

export const ROTULO_DA_FORMA: Record<FormaDePagamento, string> = {
  Dinheiro: "Dinheiro",
  Pix: "Pix",
  CartaoDeCredito: "Cartão de crédito",
  CartaoDeDebito: "Cartão de débito",
  Boleto: "Boleto",
  Transferencia: "Transferência",
  Outro: "Outro",
};

/** Forma que a tela não conhece (versão nova do servidor) aparece pelo nome que veio. */
export function rotuloDaForma(forma: string | undefined): string {
  if (!forma) return "—";
  return (ROTULO_DA_FORMA as Record<string, string>)[forma] ?? forma;
}

/** A forma, se for uma que a tela conhece. */
export function formaConhecida(forma: string | undefined): FormaDePagamento | null {
  return (FORMAS_DE_PAGAMENTO as readonly string[]).includes(forma ?? "") ? (forma as FormaDePagamento) : null;
}

export interface ReciboResumo {
  id: string;
  ano: number;
  numero: number;
  numeroFormatado: string;
  nomeDoPagador: string;
  cpfDoPagador?: string;
  alunoNome?: string;
  valor: number;
  referenteA: string;
  formaDePagamento: string;
  dataDoPagamento: string;
  emitidoEm: string;
  enviadoPorEmailEm?: string;
  cancelado: boolean;
}

export interface ReciboDetalhe extends ReciboResumo {
  valorPorExtenso?: string;
  observacoes?: string;
  emailDestino?: string;
  motivoDoCancelamento?: string;
  revenueEntryId?: string;
  studentId?: number;
  guardianId?: string;
}

export interface AlunoDoPagador {
  studentId: number;
  nome: string;
  turma?: string;
}

export interface ReceitaPaga {
  revenueEntryId: string;
  descricao?: string;
  valor: number;
  dataPagamento?: string;
  studentId?: number;
}

export interface PrePreenchimento {
  guardianId?: string;
  nomeDoPagador: string;
  cpfDoPagador?: string;
  email?: string;
  alunos: AlunoDoPagador[];
  sugestao: {
    studentId?: number;
    valor?: number;
    referenteA?: string;
    dataDoPagamento?: string;
    formaDePagamento?: string;
  };
  receitasPagas: ReceitaPaga[];
}

export interface NovoRecibo {
  guardianId: string;
  studentId?: number;
  revenueEntryId?: string;
  valor: number;
  referenteA: string;
  formaDePagamento: FormaDePagamento;
  /** "yyyy-MM-dd" */
  dataDoPagamento: string;
  observacoes?: string;
}

function consulta(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [nome, valor] of Object.entries(params)) {
    if (valor === null || valor === undefined || valor === "") continue;
    q.set(nome, String(valor));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

/** Dia do pagamento sem a hora, se o servidor mandar "...T00:00:00". */
function soData(valor: string | undefined): string | undefined {
  return valor ? valor.slice(0, 10) : valor;
}

export function useRecibos(filtro: { ano?: number; incluirCancelados: boolean }) {
  return useQuery({
    queryKey: [CHAVE, "lista", filtro.ano ?? null, filtro.incluirCancelados],
    staleTime: 30_000,
    queryFn: async () => {
      const lista = await recibosJson<ReciboResumo[] | null>(
        consulta({ ano: filtro.ano, incluirCancelados: filtro.incluirCancelados }),
        {},
        "Não foi possível carregar os recibos."
      );
      return (lista ?? []).map((r) => ({ ...r, dataDoPagamento: soData(r.dataDoPagamento) ?? "" }));
    },
  });
}

/**
 * Anos em que há recibo, para o filtro de ano.
 *
 * Pergunta sem `ano` e com cancelados: se o servidor assumir o ano corrente nesse caso, a lista
 * volta só com ele e o filtro continua funcionando (ano corrente + ano escolhido).
 */
export function useAnosComRecibo() {
  return useQuery({
    queryKey: [CHAVE, "anos"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const lista = await recibosJson<ReciboResumo[] | null>(
        consulta({ incluirCancelados: true }),
        {},
        "Não foi possível carregar os anos."
      );
      return [...new Set((lista ?? []).map((r) => r.ano))];
    },
  });
}

export function useRecibo(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "detalhe", id],
    enabled: !!id,
    queryFn: () => recibosJson<ReciboDetalhe>(`/${id}`, {}, "Não foi possível carregar o recibo."),
  });
}

export function usePrePreencherRecibo(origem: { guardianId?: string; revenueEntryId?: string; studentId?: string }) {
  const { guardianId, revenueEntryId, studentId } = origem;
  return useQuery({
    queryKey: [CHAVE, "pre-preencher", guardianId ?? null, revenueEntryId ?? null, studentId ?? null],
    enabled: !!guardianId || !!revenueEntryId,
    queryFn: async () => {
      const b = await recibosJson<Partial<PrePreenchimento> | null>(
        `/pre-preencher${consulta({ guardianId, revenueEntryId, studentId })}`,
        {},
        "Não foi possível preencher os dados do recibo."
      );
      return {
        guardianId: b?.guardianId,
        nomeDoPagador: b?.nomeDoPagador ?? "",
        cpfDoPagador: b?.cpfDoPagador,
        email: b?.email,
        alunos: b?.alunos ?? [],
        sugestao: {
          ...(b?.sugestao ?? {}),
          dataDoPagamento: soData(b?.sugestao?.dataDoPagamento),
        },
        receitasPagas: (b?.receitasPagas ?? []).map((r) => ({ ...r, dataPagamento: soData(r.dataPagamento) })),
      } satisfies PrePreenchimento;
    },
  });
}

export function useProximoNumeroDeRecibo(ano: number) {
  return useQuery({
    queryKey: [CHAVE, "proximo-numero", ano],
    queryFn: () =>
      recibosJson<{ ano: number; numero: number }>(
        `/proximo-numero${consulta({ ano })}`,
        {},
        "Não foi possível consultar o próximo número."
      ),
  });
}

/** "0001/2026" a partir do número e do ano. */
export function numeroDeReciboFormatado(numero: number, ano: number): string {
  return `${String(numero).padStart(4, "0")}/${ano}`;
}

export function useEmitirRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: NovoRecibo) =>
      recibosJson<ReciboDetalhe>(
        "",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível emitir o recibo."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEnviarReciboPorEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      recibosJson<ReciboDetalhe>(
        `/${id}/enviar-email`,
        { method: "POST", body: JSON.stringify({ email }) },
        "Não foi possível enviar o recibo por e-mail."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useCancelarRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      recibosJson<ReciboDetalhe>(
        `/${id}/cancelar`,
        { method: "POST", body: JSON.stringify({ motivo }) },
        "Não foi possível cancelar o recibo."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}
