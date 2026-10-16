import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consulta, relacionamentoJson, relacionamentoUploadVarios } from "./api";
import { tipoConhecido, type TipoDeRegistro } from "./diario-vocabulario";

/**
 * Diário do aluno, pelo lado da escola (2026-10) — /api/Relacionamento/diario, área `diario`.
 *
 * Mesma regra dos outros hooks do módulo: o servidor omite o que é nulo, então tudo passa por
 * normalizadores. Datas são "yyyy-MM-dd" e horas "HH:mm" até a tela. O diário de um aluno é
 * endereçado por aluno + dia (não por id): consultar não cria nada, e a primeira gravação cria.
 *
 * Registros de Saúde são dado sensível (LGPD): ficam só nestas telas e no portal do responsável do
 * aluno; nada daqui vai para log, URL ou armazenamento do navegador.
 */

const CHAVE = "relacionamento";
const RAIZ = [CHAVE, "diario"] as const;

/** Fotos por diário e por envio (o servidor confere de novo). */
export const MAXIMO_DE_FOTOS_DO_DIARIO = 6;

// ------------------------------------------------------------------ tipos

export type StatusDoDiario = "SemDiario" | "Rascunho" | "Publicado";

function statusDoDiario(v: string | null | undefined): StatusDoDiario {
  return v === "Publicado" || v === "Rascunho" ? v : "SemDiario";
}

export interface BlocosDaTurma {
  alimentacao: boolean;
  sono: boolean;
  higiene: boolean;
  /** Troca de fralda dentro da Higiene. */
  fralda: boolean;
  humor: boolean;
  saude: boolean;
  reposicao: boolean;
  fotos: boolean;
}

export const TODOS_OS_BLOCOS: BlocosDaTurma = {
  alimentacao: true,
  sono: true,
  higiene: true,
  fralda: true,
  humor: true,
  saude: true,
  reposicao: true,
  fotos: true,
};

/** O bloco está ligado para a turma? O Recado vale sempre. */
export function blocoLigado(blocos: BlocosDaTurma, tipo: TipoDeRegistro): boolean {
  switch (tipo) {
    case "Alimentacao":
      return blocos.alimentacao;
    case "Sono":
      return blocos.sono;
    case "Higiene":
      return blocos.higiene;
    case "Humor":
      return blocos.humor;
    case "Saude":
      return blocos.saude;
    case "Reposicao":
      return blocos.reposicao;
    default:
      return true;
  }
}

export interface RegistroDoDiario {
  id: string;
  tipo: TipoDeRegistro;
  subtipo: string | null;
  nivel: string | null;
  /** HH:mm */
  horaInicio: string | null;
  horaFim: string | null;
  /** Temperatura em °C. */
  valor: number | null;
  dose: string | null;
  texto: string | null;
  ordem: number;
  duracaoMinutos: number | null;
}

/** O que se envia por registro: o tipo vem do bloco que o contém. */
export interface RegistroParaSalvar {
  subtipo?: string | null;
  nivel?: string | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  valor?: number | null;
  dose?: string | null;
  texto?: string | null;
}

export interface FotoDoDiario {
  id: string;
  legenda: string | null;
  ordem: number;
  largura: number | null;
  altura: number | null;
}

export interface DiarioDoAluno {
  /** Nulo = ainda não existe (a primeira gravação cria). */
  id: string | null;
  studentId: number;
  aluno: string;
  classId: number;
  turma: string;
  data: string;
  status: StatusDoDiario;
  publicadoEm: string | null;
  /** Publicado e editado depois: a família vê "Atualizado". */
  atualizado: boolean;
  recadoGeral: string | null;
  /** Nulo = a escola ainda não perguntou (e isso não autoriza foto). */
  autorizaUsoDeImagem: boolean | null;
  blocos: BlocosDaTurma;
  registros: RegistroDoDiario[];
  fotos: FotoDoDiario[];
  /** Algum responsável já abriu o diário publicado. */
  lido: boolean;
}

export interface ContagemDosBlocos {
  alimentacao: number;
  sono: number;
  higiene: number;
  humor: number;
  saude: number;
  reposicao: number;
  recado: number;
}

export interface AlunoDoPainel {
  studentId: number;
  nome: string;
  autorizaUsoDeImagem: boolean | null;
  diarioId: string | null;
  status: StatusDoDiario;
  contagem: ContagemDosBlocos;
  fotos: number;
  /** Rascunho com algo lançado: entra no "publicar todos os prontos". */
  pronto: boolean;
  atualizado: boolean;
  lido: boolean;
}

export interface PainelDaTurma {
  classId: number;
  turma: string;
  data: string;
  blocos: BlocosDaTurma;
  total: number;
  lancados: number;
  prontos: number;
  publicados: number;
  alunos: AlunoDoPainel[];
}

export interface HistoricoDoAluno {
  studentId: number;
  aluno: string;
  de: string;
  ate: string;
  /** Só os dias com diário, do mais novo para o mais antigo. */
  dias: DiarioDoAluno[];
}

export interface LoteAplicado {
  aplicados: number[];
  jaLancados: number[];
}

// ------------------------------------------------------------------ normalização

type BlocosCrus = Partial<BlocosDaTurma> | null | undefined;

function blocos(b: BlocosCrus): BlocosDaTurma {
  return {
    alimentacao: b?.alimentacao ?? true,
    sono: b?.sono ?? true,
    higiene: b?.higiene ?? true,
    fralda: b?.fralda ?? true,
    humor: b?.humor ?? true,
    saude: b?.saude ?? true,
    reposicao: b?.reposicao ?? true,
    fotos: b?.fotos ?? true,
  };
}

type RegistroCru = Partial<Omit<RegistroDoDiario, "tipo">> & { tipo?: string };

export function registro(r: RegistroCru): RegistroDoDiario | null {
  const tipo = tipoConhecido(r.tipo);
  if (!tipo) return null;
  return {
    id: r.id ?? "",
    tipo,
    subtipo: r.subtipo ?? null,
    nivel: r.nivel ?? null,
    horaInicio: r.horaInicio ?? null,
    horaFim: r.horaFim ?? null,
    valor: r.valor ?? null,
    dose: r.dose ?? null,
    texto: r.texto?.trim() ? r.texto : null,
    ordem: r.ordem ?? 0,
    duracaoMinutos: r.duracaoMinutos ?? null,
  };
}

export function registros(lista: RegistroCru[] | null | undefined): RegistroDoDiario[] {
  return (lista ?? []).map(registro).filter((r): r is RegistroDoDiario => r !== null);
}

type FotoCrua = Partial<FotoDoDiario>;

export function fotosDoDiario(lista: FotoCrua[] | null | undefined): FotoDoDiario[] {
  return (lista ?? [])
    .map((f) => ({
      id: f.id ?? "",
      legenda: f.legenda?.trim() ? f.legenda : null,
      ordem: f.ordem ?? 0,
      largura: f.largura ?? null,
      altura: f.altura ?? null,
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

type DiarioCru = Partial<Omit<DiarioDoAluno, "registros" | "fotos" | "blocos" | "status">> & {
  status?: string;
  blocos?: BlocosCrus;
  registros?: RegistroCru[];
  fotos?: FotoCrua[];
};

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

function diario(d: DiarioCru): DiarioDoAluno {
  return {
    id: d.id ?? null,
    studentId: d.studentId ?? 0,
    aluno: d.aluno ?? "",
    classId: d.classId ?? 0,
    turma: d.turma ?? "",
    data: dia(d.data),
    status: statusDoDiario(d.status),
    publicadoEm: d.publicadoEm ?? null,
    atualizado: d.atualizado ?? false,
    recadoGeral: d.recadoGeral?.trim() ? d.recadoGeral : null,
    autorizaUsoDeImagem: d.autorizaUsoDeImagem ?? null,
    blocos: blocos(d.blocos),
    registros: registros(d.registros),
    fotos: fotosDoDiario(d.fotos),
    lido: d.lido ?? false,
  };
}

type PainelCru = Partial<Omit<PainelDaTurma, "blocos" | "alunos">> & {
  blocos?: BlocosCrus;
  alunos?: (Partial<Omit<AlunoDoPainel, "status" | "contagem">> & {
    status?: string;
    contagem?: Partial<ContagemDosBlocos>;
  })[];
};

function painel(p: PainelCru): PainelDaTurma {
  return {
    classId: p.classId ?? 0,
    turma: p.turma ?? "",
    data: dia(p.data),
    blocos: blocos(p.blocos),
    total: p.total ?? 0,
    lancados: p.lancados ?? 0,
    prontos: p.prontos ?? 0,
    publicados: p.publicados ?? 0,
    alunos: (p.alunos ?? []).map((a) => ({
      studentId: a.studentId ?? 0,
      nome: a.nome ?? "",
      autorizaUsoDeImagem: a.autorizaUsoDeImagem ?? null,
      diarioId: a.diarioId ?? null,
      status: statusDoDiario(a.status),
      contagem: {
        alimentacao: a.contagem?.alimentacao ?? 0,
        sono: a.contagem?.sono ?? 0,
        higiene: a.contagem?.higiene ?? 0,
        humor: a.contagem?.humor ?? 0,
        saude: a.contagem?.saude ?? 0,
        reposicao: a.contagem?.reposicao ?? 0,
        recado: a.contagem?.recado ?? 0,
      },
      fotos: a.fotos ?? 0,
      pronto: a.pronto ?? false,
      atualizado: a.atualizado ?? false,
      lido: a.lido ?? false,
    })),
  };
}

// ------------------------------------------------------------------ leitura

/** O painel do dia: alunos da turma, status do diário de cada um e a contagem por bloco. */
export function usePainelDaTurma(classId: number | null, data: string) {
  return useQuery({
    queryKey: [...RAIZ, "turma", classId, data],
    enabled: classId !== null && classId > 0 && !!data,
    // Várias pessoas lançam ao mesmo tempo na mesma turma: o painel se atualiza sozinho.
    staleTime: 10_000,
    refetchInterval: 60_000,
    queryFn: async () =>
      painel(
        (await relacionamentoJson<PainelCru>(
          `/diario/turma/${classId}${consulta({ data })}`,
          {},
          "Não foi possível carregar o diário da turma."
        )) ?? {}
      ),
  });
}

/** O diário de um aluno no dia (vazio, com `id` nulo, quando ainda não existe). */
export function useDiarioDoAluno(studentId: number | null, data: string) {
  return useQuery({
    queryKey: [...RAIZ, "aluno", studentId, data],
    enabled: studentId !== null && !!data,
    // Sem cache: o painel parte do que está no servidor agora (outra pessoa pode ter lançado o mesmo
    // aluno), e dado de saúde não fica guardado em memória depois de fechar o painel.
    staleTime: 0,
    gcTime: 0,
    queryFn: async () =>
      diario(
        (await relacionamentoJson<DiarioCru>(
          `/diario/alunos/${studentId}/${data}`,
          {},
          "Não foi possível abrir o diário do aluno."
        )) ?? {}
      ),
  });
}

/** Os dias com diário do aluno (padrão: 14 dias até hoje). */
export function useHistoricoDoAluno(studentId: number | null, de: string, ate: string, ativo = true) {
  return useQuery({
    queryKey: [...RAIZ, "historico", studentId, de, ate],
    enabled: ativo && studentId !== null && !!de && !!ate,
    staleTime: 30_000,
    queryFn: async (): Promise<HistoricoDoAluno> => {
      const r = await relacionamentoJson<
        (Partial<Omit<HistoricoDoAluno, "dias">> & { dias?: DiarioCru[] }) | null
      >(
        `/diario/alunos/${studentId}/historico${consulta({ de, ate })}`,
        {},
        "Não foi possível carregar o histórico."
      );
      return {
        studentId: r?.studentId ?? studentId ?? 0,
        aluno: r?.aluno ?? "",
        de: dia(r?.de) || de,
        ate: dia(r?.ate) || ate,
        dias: (r?.dias ?? []).map(diario),
      };
    },
  });
}

export function useBlocosDaTurma(classId: number | null) {
  return useQuery({
    queryKey: [...RAIZ, "blocos", classId],
    enabled: classId !== null && classId > 0,
    staleTime: 30_000,
    queryFn: async () =>
      blocos(
        await relacionamentoJson<BlocosCrus>(
          `/diario/turma/${classId}/blocos`,
          {},
          "Não foi possível carregar os blocos da turma."
        )
      ),
  });
}

// ------------------------------------------------------------------ escrita

/** Corpo do PUT: só os blocos enviados são substituídos; `recadoGeral` nulo não mexe e vazio limpa. */
export interface SalvarDiario {
  recadoGeral?: string | null;
  blocos: { tipo: TipoDeRegistro; registros: RegistroParaSalvar[] }[];
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: RAIZ });
}

export function useSalvarDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, data, dados }: { studentId: number; data: string; dados: SalvarDiario }) =>
      diario(
        (await relacionamentoJson<DiarioCru>(
          `/diario/alunos/${studentId}/${data}`,
          { method: "PUT", body: JSON.stringify(dados) },
          "Não foi possível salvar o diário."
        )) ?? {}
      ),
    onSuccess: () => invalidar(queryClient),
  });
}

export function usePublicarDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: string }) =>
      relacionamentoJson<void>(
        `/diario/alunos/${studentId}/${data}/publicar`,
        { method: "POST" },
        "Não foi possível publicar o diário."
      ),
    onSuccess: () => invalidar(queryClient),
  });
}

export function useDespublicarDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: string }) =>
      relacionamentoJson<void>(
        `/diario/alunos/${studentId}/${data}/despublicar`,
        { method: "POST" },
        "Não foi possível despublicar o diário."
      ),
    onSuccess: () => invalidar(queryClient),
  });
}

/** Publica os rascunhos com algo lançado da turma no dia. Devolve quantos foram publicados. */
export function usePublicarProntos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, data }: { classId: number; data: string }) => {
      const r = await relacionamentoJson<{ publicados?: number } | null>(
        `/diario/turma/${classId}/publicar-prontos`,
        { method: "POST", body: JSON.stringify({ data }) },
        "Não foi possível publicar os diários."
      );
      return r?.publicados ?? 0;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

/** O mesmo registro para vários alunos da turma. Quem já tinha o mesmo bloco/horário fica como estava. */
export function useLancarEmLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      data,
      studentIds,
      tipo,
      registro: r,
    }: {
      classId: number;
      data: string;
      studentIds: number[];
      tipo: TipoDeRegistro;
      registro: RegistroParaSalvar;
    }): Promise<LoteAplicado> => {
      const res = await relacionamentoJson<Partial<LoteAplicado> | null>(
        `/diario/turma/${classId}/lote`,
        { method: "POST", body: JSON.stringify({ data, studentIds, tipo, registro: r }) },
        "Não foi possível lançar para a turma."
      );
      return { aplicados: res?.aplicados ?? [], jaLancados: res?.jaLancados ?? [] };
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useSalvarBlocosDaTurma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, dados }: { classId: number; dados: BlocosDaTurma }) =>
      blocos(
        await relacionamentoJson<BlocosCrus>(
          `/diario/turma/${classId}/blocos`,
          { method: "PUT", body: JSON.stringify(dados) },
          "Não foi possível salvar os blocos da turma."
        )
      ),
    onSuccess: () => invalidar(queryClient),
  });
}

// ------------------------------------------------------------------ fotos

/** Envia as fotos (até 6 por diário). O servidor recusa a de aluno sem autorização de imagem. */
export function useEnviarFotosDoDiario(studentId: number, data: string) {
  const queryClient = useQueryClient();
  return async (arquivos: File[]) => {
    await relacionamentoUploadVarios<unknown>(
      `/diario/alunos/${studentId}/${data}/fotos`,
      "arquivos",
      arquivos,
      "Não foi possível enviar as fotos."
    );
    await invalidar(queryClient);
  };
}

export function useRemoverFotoDoDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fotoId: string) =>
      relacionamentoJson<void>(`/diario/fotos/${fotoId}`, { method: "DELETE" }, "Não foi possível remover a foto."),
    onSuccess: () => invalidar(queryClient),
  });
}
