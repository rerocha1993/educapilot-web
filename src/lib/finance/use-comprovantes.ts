import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  API_FINANCEIRO,
  abrirArquivoEmNovaAba,
  financeiroBaixarArquivo,
  financeiroEnviarArquivo,
  financeiroJson,
} from "./financeiro-api";

/**
 * Caixa de comprovantes (fase W1, 2026-10): foto ou PDF de comprovante que chega pelo WhatsApp
 * ou pela tela, lido sem IA (texto do PDF ou OCR + regras) e conferido por uma pessoa antes de
 * virar despesa — /api/financeiro/comprovantes. Tipado à mão, com fetch cru (ver financeiro-api.ts).
 *
 * Datas "aaaa-mm-dd" são só-data; instantes (recebidoEm, lancadoEm...) são ISO. Campos nulos
 * podem vir ausentes, por isso os opcionais aceitam `null` e `undefined`.
 */

const CHAVE = ["finance", "comprovantes"] as const;
const BASE = `${API_FINANCEIRO}/comprovantes`;

export type StatusDoComprovanteRecebido = "Recebido" | "Lido" | "SemLeitura" | "Lancado" | "Descartado";
export type OrigemDoComprovante = "WhatsApp" | "Tela";
export type MetodoDaLeitura = "pdf-texto" | "ocr" | "anthropic";

export interface ItemLidoDoComprovante {
  descricao: string;
  quantidade?: number | null;
  valorUnitario?: number | null;
  valorTotal?: number | null;
}

export interface ConfiancaDaLeitura {
  valor: number | null;
  data: number | null;
  fornecedor: number | null;
}

export interface ComprovanteRecebido {
  id: string;
  origem: OrigemDoComprovante;
  remetenteId?: string | null;
  remetenteNome?: string | null;
  wamId?: string | null;
  arquivoNome: string;
  contentType: string;
  tamanho: number;
  legenda?: string | null;
  recebidoEm: string;
  status: StatusDoComprovanteRecebido;
  valorLido?: number | null;
  /** aaaa-mm-dd */
  dataLida?: string | null;
  fornecedorLido?: string | null;
  documentoLido?: string | null;
  itensLidos?: ItemLidoDoComprovante[] | null;
  confianca?: ConfiancaDaLeitura | null;
  metodoDaLeitura?: MetodoDaLeitura | null;
  erroDaLeitura?: string | null;
  destinoSugerido?: string | null;
  projetoSugeridoId?: string | null;
  projetoSugeridoNome?: string | null;
  categoriaSugeridaId?: string | null;
  categoriaSugeridaNome?: string | null;
  contaSugeridaId?: string | null;
  contaSugeridaNome?: string | null;
  expenseId?: string | null;
  lancadoEm?: string | null;
  descartadoEm?: string | null;
  motivoDoDescarte?: string | null;
  temArquivo: boolean;
}

export interface PaginaDeComprovantes {
  itens: ComprovanteRecebido[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface ResumoDosComprovantes {
  aLancar: number;
  semLeitura: number;
  lancadosNoMes: number;
}

export interface LancamentoDeDespesa {
  valor: number;
  /** aaaa-mm-dd */
  data: string;
  descricao: string;
  fornecedorNome?: string;
  fornecedorDocumento?: string;
  categoriaFinanceiraId?: string;
  contaFinanceiraId?: string;
  centroDeCustoId?: string;
  formaDePagamento?: string;
  observacao?: string;
}

// ------------------------------------------------------------------ regras da tela

/** Os três estados em que o comprovante ainda espera alguém: "a lançar". */
export const STATUS_A_LANCAR: StatusDoComprovanteRecebido[] = ["Recebido", "Lido", "SemLeitura"];

export function estaALancar(c: Pick<ComprovanteRecebido, "status">): boolean {
  return STATUS_A_LANCAR.includes(c.status);
}

/** Abaixo disto o campo lido merece conferência (destaque amarelo). */
export const CONFIANCA_BAIXA = 0.6;

export function confiancaBaixa(c: number | null | undefined): boolean {
  return c !== null && c !== undefined && c < CONFIANCA_BAIXA;
}

export function ehPdf(c: Pick<ComprovanteRecebido, "contentType" | "arquivoNome">): boolean {
  return !!c.contentType?.toLowerCase().includes("pdf") || /\.pdf$/i.test(c.arquivoNome);
}

export const ROTULO_DA_ORIGEM: Record<OrigemDoComprovante, string> = {
  WhatsApp: "WhatsApp",
  Tela: "Enviado pela tela",
};

// ------------------------------------------------------------------ filtros

export type FiltroDeSituacao = "ALancar" | "Lancado" | "Descartado" | "Todos";

export interface FiltrosDosComprovantes {
  situacao: FiltroDeSituacao;
  de: string;
  ate: string;
  remetenteId: string;
  origem: "" | OrigemDoComprovante;
  pagina: number;
  tamanho: number;
}

/**
 * O valor de `status` na consulta. "A lançar" são três situações: vai como lista separada por
 * vírgula (Recebido,Lido,SemLeitura). Fica num lugar só para ajustar se a API pedir outro formato.
 */
function statusDaConsulta(situacao: FiltroDeSituacao): string | null {
  // O backend tem o alias "pendentes" = Recebido + Lido + SemLeitura.
  if (situacao === "ALancar") return "pendentes";
  if (situacao === "Todos") return null;
  return situacao;
}

function consultaDe(f: FiltrosDosComprovantes): string {
  const q = new URLSearchParams();
  const status = statusDaConsulta(f.situacao);
  if (status) q.set("status", status);
  if (f.de) q.set("de", f.de);
  if (f.ate) q.set("ate", f.ate);
  if (f.remetenteId) q.set("remetenteId", f.remetenteId);
  if (f.origem) q.set("origem", f.origem);
  q.set("pagina", String(f.pagina));
  q.set("tamanho", String(f.tamanho));
  return q.toString();
}

// ------------------------------------------------------------------ leituras

/** Enquanto algum comprovante ainda está sendo lido, a lista se atualiza sozinha. */
const INTERVALO_DA_LEITURA = 5_000;

export function useComprovantesRecebidos(filtros: FiltrosDosComprovantes) {
  return useQuery({
    queryKey: [...CHAVE, "lista", filtros],
    placeholderData: keepPreviousData,
    refetchInterval: (consulta) =>
      consulta.state.data?.itens.some((c) => c.status === "Recebido") ? INTERVALO_DA_LEITURA : false,
    queryFn: async (): Promise<PaginaDeComprovantes> => {
      const pagina = await financeiroJson<PaginaDeComprovantes | null>(
        `${BASE}?${consultaDe(filtros)}`,
        {},
        "Não foi possível carregar os comprovantes."
      );
      return {
        itens: pagina?.itens ?? [],
        total: pagina?.total ?? 0,
        pagina: pagina?.pagina ?? filtros.pagina,
        tamanho: pagina?.tamanho ?? filtros.tamanho,
      };
    },
  });
}

/**
 * Os números do alto da Caixa e a pendência do Início. Falha ou sem a área: a consulta erra e quem
 * usa mostra como zero — um selo que erra não deve derrubar a página.
 */
export function useResumoDosComprovantes(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE, "resumo"],
    enabled: habilitado,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<ResumoDosComprovantes> => {
      const r = await financeiroJson<Partial<ResumoDosComprovantes> | null>(
        `${BASE}/resumo`,
        {},
        "Não foi possível carregar o resumo dos comprovantes."
      );
      return {
        aLancar: r?.aLancar ?? 0,
        semLeitura: r?.semLeitura ?? 0,
        lancadosNoMes: r?.lancadosNoMes ?? 0,
      };
    },
  });
}

// ------------------------------------------------------------------ escritas

function useEscrita<V, R = ComprovanteRecebido>(
  enviar: (v: V) => Promise<R>,
  { despesa = false }: { despesa?: boolean } = {}
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviar,
    onSuccess: async () => {
      if (despesa) queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: CHAVE });
    },
  });
}

export function useEnviarComprovanteDaTela() {
  return useEscrita(({ arquivo, legenda }: { arquivo: File; legenda?: string }) =>
    financeiroEnviarArquivo<ComprovanteRecebido>(
      `${BASE}/enviar`,
      arquivo,
      "Não foi possível enviar o comprovante.",
      { legenda: legenda?.trim() || undefined }
    )
  );
}

export function useRelerComprovanteRecebido() {
  return useEscrita((id: string) =>
    financeiroJson<ComprovanteRecebido>(
      `${BASE}/${id}/reler`,
      { method: "POST" },
      "Não foi possível reler o comprovante."
    )
  );
}

export function useLancarDespesaDoComprovante() {
  return useEscrita(
    ({ id, dados }: { id: string; dados: LancamentoDeDespesa }) =>
      financeiroJson<ComprovanteRecebido>(
        `${BASE}/${id}/lancar-despesa`,
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível lançar a despesa."
      ),
    { despesa: true }
  );
}

export function useDescartarComprovante() {
  return useEscrita(({ id, motivo }: { id: string; motivo?: string }) =>
    financeiroJson<ComprovanteRecebido>(
      `${BASE}/${id}/descartar`,
      { method: "POST", body: JSON.stringify({ motivo: motivo?.trim() || undefined }) },
      "Não foi possível descartar o comprovante."
    )
  );
}

/** Abre o arquivo do comprovante numa aba nova (a aba abre no clique; ver abrirArquivoEmNovaAba). */
export function abrirArquivoDoComprovanteRecebido(id: string, nomeDoArquivo: string, janela?: Window | null) {
  return abrirArquivoEmNovaAba(
    `${BASE}/${id}/arquivo`,
    nomeDoArquivo,
    janela,
    "Não foi possível abrir o arquivo do comprovante."
  );
}

// ------------------------------------------------------------------ arquivo com Bearer

/**
 * O arquivo do comprovante exige o Bearer, então <img src> direto não serve: é baixado com fetch
 * e exibido por um object URL. O cache é em memória, por id, e conta quantos componentes usam
 * cada arquivo; o object URL só é revogado depois de uma folga depois que o último solta, para
 * abrir o diálogo sobre a lista reaproveitar o que a miniatura já baixou (mesmo desenho de
 * FotoAutenticada, do Relacionamento).
 */
interface ArquivoEmCache {
  promessa: Promise<{ url: string; tipo: string }>;
  usos: number;
  liberacao: ReturnType<typeof setTimeout> | null;
}

const FOLGA_DO_CACHE = 60_000;
const cacheDeArquivos = new Map<string, ArquivoEmCache>();

function revogarArquivo(id: string) {
  const entrada = cacheDeArquivos.get(id);
  if (!entrada) return;
  cacheDeArquivos.delete(id);
  void entrada.promessa.then((a) => URL.revokeObjectURL(a.url)).catch(() => {});
}

function adquirirArquivo(id: string) {
  let entrada = cacheDeArquivos.get(id);

  if (!entrada) {
    const promessa = financeiroBaixarArquivo(`${BASE}/${id}/arquivo`, "Não foi possível carregar o arquivo.").then(
      (blob) => ({ url: URL.createObjectURL(blob), tipo: blob.type })
    );
    entrada = { promessa, usos: 0, liberacao: null };
    cacheDeArquivos.set(id, entrada);
    // Falha não fica no cache: o próximo a pedir tenta de novo.
    promessa.catch(() => {
      if (cacheDeArquivos.get(id)?.promessa === promessa) cacheDeArquivos.delete(id);
    });
  }

  if (entrada.liberacao) {
    clearTimeout(entrada.liberacao);
    entrada.liberacao = null;
  }
  entrada.usos += 1;
  return entrada.promessa;
}

function soltarArquivo(id: string) {
  const entrada = cacheDeArquivos.get(id);
  if (!entrada) return;

  entrada.usos -= 1;
  if (entrada.usos > 0 || entrada.liberacao) return;
  entrada.liberacao = setTimeout(() => revogarArquivo(id), FOLGA_DO_CACHE);
}

export interface ArquivoDoComprovante {
  /** Object URL do arquivo, ou nulo enquanto carrega (ou se falhou). */
  url: string | null;
  /** Tipo MIME que o servidor devolveu. */
  tipo: string | null;
  carregando: boolean;
  falhou: boolean;
}

type EstadoDoArquivo = { id: string; url: string | null; tipo: string | null; falhou: boolean };

/** Baixa o arquivo do comprovante com o token e o entrega como object URL. */
export function useArquivoDoComprovante(id: string, habilitado = true): ArquivoDoComprovante {
  const [estado, setEstado] = useState<EstadoDoArquivo>({ id, url: null, tipo: null, falhou: false });

  useEffect(() => {
    if (!habilitado) return;
    let ativo = true;
    adquirirArquivo(id).then(
      (a) => ativo && setEstado({ id, url: a.url, tipo: a.tipo, falhou: false }),
      () => ativo && setEstado({ id, url: null, tipo: null, falhou: true })
    );

    return () => {
      ativo = false;
      soltarArquivo(id);
    };
  }, [id, habilitado]);

  // Resultado de outro comprovante (o id mudou e o novo ainda não chegou) conta como "carregando".
  const atual = estado.id === id ? estado : null;
  const url = habilitado ? (atual?.url ?? null) : null;
  const falhou = habilitado && !!atual?.falhou;
  return { url, tipo: atual?.tipo ?? null, carregando: habilitado && !url && !falhou, falhou };
}
