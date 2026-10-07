import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consulta, relacionamentoJson, relacionamentoUploadVarios } from "./api";

/**
 * Relacionamento, conteúdo (2026-10): atividades de sala e mural de álbuns, com fotos —
 * /api/Relacionamento, áreas `atividades` e `mural`.
 *
 * Mesma regra dos outros hooks do módulo: o servidor omite o que é nulo, então tudo passa por
 * normalizadores que devolvem `null`. Datas são "yyyy-MM-dd". Nas listas, `fotos` é só a contagem;
 * no detalhe é a lista (com `ordem`, `legenda` e as dimensões).
 */

const CHAVE = "relacionamento";

// ------------------------------------------------------------------ vocabulário

/** Quantas fotos cabem por chamada e por conteúdo (o servidor confere de novo). */
export const LIMITES_DE_FOTOS = {
  atividades: { porLote: 10, porConteudo: 30 },
  mural: { porLote: 20, porConteudo: 200 },
} as const;

export type TipoDeConteudo = keyof typeof LIMITES_DE_FOTOS;

export const STATUS_DA_ATIVIDADE = ["Rascunho", "Publicada"] as const;
export type StatusDaAtividade = (typeof STATUS_DA_ATIVIDADE)[number];

export const STATUS_DO_ALBUM = ["Rascunho", "Publicado"] as const;
export type StatusDoAlbum = (typeof STATUS_DO_ALBUM)[number];

function statusDaAtividade(v: string | null | undefined): StatusDaAtividade {
  return v === "Publicada" ? "Publicada" : "Rascunho";
}

function statusDoAlbum(v: string | null | undefined): StatusDoAlbum {
  return v === "Publicado" ? "Publicado" : "Rascunho";
}

// ------------------------------------------------------------------ tipos

export interface FotoDeConteudo {
  /** Guid. */
  id: string;
  legenda: string | null;
  ordem: number;
  largura: number | null;
  altura: number | null;
}

export interface AtividadeResumo {
  id: string;
  classId: number;
  turma: string;
  /** yyyy-MM-dd */
  data: string;
  titulo: string;
  resumo: string;
  status: StatusDaAtividade;
  /** Instante UTC. */
  publicadaEm: string | null;
  professorNome: string;
  totalDeFotos: number;
  capaFotoId: string | null;
}

export interface AtividadeDetalhe extends AtividadeResumo {
  texto: string;
  fotos: FotoDeConteudo[];
}

export interface FiltroDeAtividades {
  classId: number | null;
  /** yyyy-MM-dd */
  de: string;
  ate: string;
  status: StatusDaAtividade | null;
}

export interface SalvarAtividade {
  classId: number;
  data: string;
  titulo: string;
  texto: string;
  /** Só na criação: o PUT grava o conteúdo e a publicação é uma chamada à parte. */
  publicarAgora?: boolean;
}

export interface AlbumResumo {
  id: string;
  titulo: string;
  /** Nulo = escola toda. */
  classId: number | null;
  turma: string | null;
  escolaToda: boolean;
  dataDoEvento: string | null;
  status: StatusDoAlbum;
  publicadoEm: string | null;
  totalDeFotos: number;
  capaFotoId: string | null;
}

export interface AlbumDetalhe extends AlbumResumo {
  descricao: string;
  fotos: FotoDeConteudo[];
}

export interface FiltroDeAlbuns {
  classId: number | null;
  status: StatusDoAlbum | null;
}

export interface SalvarAlbum {
  titulo: string;
  descricao: string | null;
  /** Nulo = escola toda (professor nunca: o servidor recusa). */
  classId: number | null;
  dataDoEvento: string | null;
}

export interface AutorizacaoDeImagem {
  total: number;
  autorizados: number;
  naoAutorizados: number;
  naoInformados: number;
  /** Nomes de quem não tem autorização registrada (disse não ou não foi perguntado). */
  alunosSemAutorizacao: string[];
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

type FotoCrua = Partial<FotoDeConteudo>;

function foto(f: FotoCrua): FotoDeConteudo {
  return {
    id: f.id ?? "",
    legenda: f.legenda?.trim() ? f.legenda : null,
    ordem: f.ordem ?? 0,
    largura: f.largura ?? null,
    altura: f.altura ?? null,
  };
}

/** As fotos do detalhe, na ordem que a tela mostra. */
function fotos(lista: FotoCrua[] | null | undefined): FotoDeConteudo[] {
  return (lista ?? []).map(foto).sort((a, b) => a.ordem - b.ordem);
}

/** Na lista `fotos` é a contagem; num detalhe (ou prévia) é um array. */
function contagem(v: number | FotoCrua[] | null | undefined): number {
  return typeof v === "number" ? v : (v?.length ?? 0);
}

type AtividadeCrua = Omit<Partial<AtividadeResumo>, "totalDeFotos"> & {
  fotos?: number | FotoCrua[];
  texto?: string;
};

function atividadeResumo(a: AtividadeCrua): AtividadeResumo {
  return {
    id: a.id ?? "",
    classId: a.classId ?? 0,
    turma: a.turma ?? "",
    data: dia(a.data) ?? "",
    titulo: a.titulo ?? "",
    resumo: a.resumo ?? "",
    status: statusDaAtividade(a.status),
    publicadaEm: a.publicadaEm ?? null,
    professorNome: a.professorNome ?? "",
    totalDeFotos: contagem(a.fotos),
    capaFotoId: a.capaFotoId ?? null,
  };
}

function atividadeDetalhe(a: AtividadeCrua): AtividadeDetalhe {
  return {
    ...atividadeResumo(a),
    texto: a.texto ?? "",
    fotos: Array.isArray(a.fotos) ? fotos(a.fotos) : [],
  };
}

type AlbumCru = Omit<Partial<AlbumResumo>, "totalDeFotos"> & {
  fotos?: number | FotoCrua[];
  descricao?: string;
};

function albumResumo(a: AlbumCru): AlbumResumo {
  const classId = a.classId ?? null;
  return {
    id: a.id ?? "",
    titulo: a.titulo ?? "",
    classId,
    turma: a.turma ?? null,
    escolaToda: a.escolaToda ?? classId === null,
    dataDoEvento: dia(a.dataDoEvento),
    status: statusDoAlbum(a.status),
    publicadoEm: a.publicadoEm ?? null,
    totalDeFotos: contagem(a.fotos),
    capaFotoId: a.capaFotoId ?? null,
  };
}

function albumDetalhe(a: AlbumCru): AlbumDetalhe {
  return {
    ...albumResumo(a),
    descricao: a.descricao ?? "",
    fotos: Array.isArray(a.fotos) ? fotos(a.fotos) : [],
  };
}

// ------------------------------------------------------------------ atividades

export function useAtividades(filtro: FiltroDeAtividades) {
  return useQuery({
    queryKey: [CHAVE, "atividades", "lista", filtro.classId, filtro.de, filtro.ate, filtro.status],
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await relacionamentoJson<AtividadeCrua[] | null>(
        `/atividades${consulta({ classId: filtro.classId, de: filtro.de, ate: filtro.ate, status: filtro.status })}`,
        {},
        "Não foi possível carregar as atividades."
      );
      return (lista ?? [])
        .map(atividadeResumo)
        .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));
    },
  });
}

export function useAtividade(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "atividades", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      atividadeDetalhe(
        (await relacionamentoJson<AtividadeCrua>(`/atividades/${id}`, {}, "Não foi possível carregar a atividade.")) ??
          {}
      ),
  });
}

/** Cria (sem `id`) ou atualiza. */
export function useSalvarAtividade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarAtividade }) =>
      atividadeDetalhe(
        (await relacionamentoJson<AtividadeCrua>(
          id ? `/atividades/${id}` : "/atividades",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar a atividade."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "atividades"] }),
  });
}

export function usePublicarAtividade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/atividades/${id}/publicar`, { method: "POST" }, "Não foi possível publicar a atividade."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "atividades"] }),
  });
}

export function useExcluirAtividade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/atividades/${id}`, { method: "DELETE" }, "Não foi possível excluir a atividade."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "atividades"] }),
  });
}

// ------------------------------------------------------------------ mural

export function useAlbuns(filtro: FiltroDeAlbuns) {
  return useQuery({
    queryKey: [CHAVE, "mural", "lista", filtro.classId, filtro.status],
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await relacionamentoJson<AlbumCru[] | null>(
        `/mural${consulta({ classId: filtro.classId, status: filtro.status })}`,
        {},
        "Não foi possível carregar os álbuns."
      );
      return (lista ?? []).map(albumResumo);
    },
  });
}

export function useAlbum(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "mural", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      albumDetalhe((await relacionamentoJson<AlbumCru>(`/mural/${id}`, {}, "Não foi possível carregar o álbum.")) ?? {}),
  });
}

/** Cria (sem `id`) ou atualiza. */
export function useSalvarAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: SalvarAlbum }) =>
      albumDetalhe(
        (await relacionamentoJson<AlbumCru>(
          id ? `/mural/${id}` : "/mural",
          { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
          "Não foi possível salvar o álbum."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "mural"] }),
  });
}

export function usePublicarAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/mural/${id}/publicar`, { method: "POST" }, "Não foi possível publicar o álbum."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "mural"] }),
  });
}

export function useDespublicarAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/mural/${id}/despublicar`, { method: "POST" }, "Não foi possível despublicar o álbum."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "mural"] }),
  });
}

export function useExcluirAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/mural/${id}`, { method: "DELETE" }, "Não foi possível excluir o álbum."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "mural"] }),
  });
}

export function useDefinirCapaDoAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fotoId }: { id: string; fotoId: string }) =>
      relacionamentoJson<void>(`/mural/${id}/capa/${fotoId}`, { method: "POST" }, "Não foi possível definir a capa."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, "mural"] }),
  });
}

// ------------------------------------------------------------------ fotos (atividade e mural)

/**
 * Envio de fotos em lotes, com as legendas do pré-visualizar.
 *
 * O upload só leva os arquivos; a legenda é uma segunda chamada por foto (PUT). As fotos novas são
 * achadas pela diferença para as que já existiam, porque o servidor pode devolver só as enviadas
 * ou a lista inteira. `idsAtuais` são as fotos que a tela já tinha; as que este envio acrescentou
 * ficam guardadas aqui, já que a tela só as vê depois de recarregar.
 *
 * Devolve quantas legendas não puderam ser gravadas (a foto já foi enviada nesse caso).
 */
export function useEnvioDeFotos(tipo: TipoDeConteudo, id: string, idsAtuais: readonly string[]) {
  const queryClient = useQueryClient();
  const enviadas = useRef(new Set<string>());

  return useCallback(
    async (arquivos: File[], legendas: readonly string[]): Promise<{ legendasNaoGravadas: number }> => {
      const jaExistentes = new Set<string>([...idsAtuais, ...enviadas.current]);

      const retorno = await relacionamentoUploadVarios<FotoCrua[] | { fotos?: FotoCrua[] } | null>(
        `/${tipo}/${id}/fotos`,
        "arquivos",
        arquivos,
        "Não foi possível enviar as fotos."
      );
      const lista = Array.isArray(retorno) ? retorno : (retorno?.fotos ?? []);
      const novas = fotos(lista).filter((f) => f.id && !jaExistentes.has(f.id));
      for (const f of novas) enviadas.current.add(f.id);

      let legendasNaoGravadas = 0;
      if (novas.length === arquivos.length) {
        for (let i = 0; i < novas.length; i++) {
          const legenda = legendas[i]?.trim();
          if (!legenda) continue;
          try {
            await relacionamentoJson<void>(
              `/${tipo}/fotos/${novas[i].id}`,
              { method: "PUT", body: JSON.stringify({ legenda, ordem: novas[i].ordem }) },
              "Não foi possível gravar a legenda."
            );
          } catch {
            legendasNaoGravadas += 1;
          }
        }
      } else {
        // Sem como casar foto e arquivo, nenhuma legenda é gravada em foto errada.
        legendasNaoGravadas = legendas.filter((l) => l.trim()).length;
      }

      await queryClient.invalidateQueries({ queryKey: [CHAVE, tipo] });
      return { legendasNaoGravadas };
    },
    [tipo, id, idsAtuais, queryClient]
  );
}

export function useAtualizarFoto(tipo: TipoDeConteudo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fotoId, legenda, ordem }: { fotoId: string; legenda: string | null; ordem: number }) =>
      relacionamentoJson<void>(
        `/${tipo}/fotos/${fotoId}`,
        { method: "PUT", body: JSON.stringify({ legenda: legenda?.trim() || null, ordem }) },
        "Não foi possível salvar a foto."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, tipo] }),
  });
}

export function useRemoverFoto(tipo: TipoDeConteudo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fotoId: string) =>
      relacionamentoJson<void>(`/${tipo}/fotos/${fotoId}`, { method: "DELETE" }, "Não foi possível remover a foto."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE, tipo] }),
  });
}

/**
 * Move uma foto uma casa para cima ou para baixo.
 *
 * Em vez de trocar o `ordem` das duas, regrava o de todas as que ficaram fora do lugar: com as
 * ordens contíguas (o normal) são só as duas trocadas, e se o servidor tiver ordens repetidas a
 * lista sai arrumada mesmo assim. As chamadas são em sequência para o servidor nunca ver duas
 * fotos com a mesma posição ao mesmo tempo.
 */
export function useMoverFoto(tipo: TipoDeConteudo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fotos: lista, de, para }: { fotos: readonly FotoDeConteudo[]; de: number; para: number }) => {
      if (para < 0 || para >= lista.length || de === para) return;

      const base = lista[0].ordem;
      const nova = [...lista];
      const [movida] = nova.splice(de, 1);
      nova.splice(para, 0, movida);

      for (let i = 0; i < nova.length; i++) {
        if (nova[i].ordem === base + i) continue;
        await relacionamentoJson<void>(
          `/${tipo}/fotos/${nova[i].id}`,
          { method: "PUT", body: JSON.stringify({ legenda: nova[i].legenda, ordem: base + i }) },
          "Não foi possível reordenar as fotos."
        );
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [CHAVE, tipo] }),
  });
}

// ------------------------------------------------------------------ autorização de imagem

/** Quantos alunos da turma têm (ou não) autorização de uso de imagem. É só um aviso: não bloqueia nada. */
export function useAutorizacaoDeImagem(classId: number | null) {
  return useQuery({
    queryKey: [CHAVE, "autorizacao-de-imagem", classId],
    enabled: classId !== null && classId > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<AutorizacaoDeImagem> => {
      const r = await relacionamentoJson<Partial<AutorizacaoDeImagem> | null>(
        `/turmas/${classId}/autorizacao-de-imagem`,
        {},
        "Não foi possível conferir a autorização de imagem."
      );
      return {
        total: r?.total ?? 0,
        autorizados: r?.autorizados ?? 0,
        naoAutorizados: r?.naoAutorizados ?? 0,
        naoInformados: r?.naoInformados ?? 0,
        alunosSemAutorizacao: r?.alunosSemAutorizacao ?? [],
      };
    },
  });
}
