import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import type { FormDto, FormFieldDto } from "./use-forms";
import type { CepParte } from "./cep";

// Ampliado (2026-08, item 1 do gap analysis de Formulários): a coluna Opcoes existia
// no schema desde sempre mas nunca era usada — "selecao" era o único tipo que se
// aproximava de escolha, e mesmo assim só servia pra vincular a uma tabela de
// referência (Config.tabelaReferencia), nunca a uma lista estática de opções.
// Agora "selecao"/"checkbox"/"dropdown" usam Opcoes de verdade (array JSON de
// strings), "numero"/"avaliacao" ganham validação de faixa via Config, e todo campo
// pode ter lógica condicional (Config.visibleIf) — ver decodeFieldConfig abaixo.
export const FIELD_TYPES = [
  { value: "texto_curto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "sim_nao", label: "Sim/Não" },
  { value: "selecao", label: "Múltipla escolha (uma opção)" },
  { value: "checkbox", label: "Caixas de seleção (várias opções)" },
  { value: "dropdown", label: "Lista suspensa" },
  { value: "avaliacao", label: "Avaliação (escala)" },
  { value: "anexo", label: "Anexo" },
  { value: "referencia", label: "Dado de referência" },
  // Novo (2026-09): exibe um contrato para o respondente ler e aceitar. Ao enviar o
  // formulário, o backend gera o PDF e manda para assinatura eletrônica — ver o módulo
  // Contracts no backend.
  { value: "contrato", label: "Contrato para assinatura" },
  // Novo (2026-09): ao digitar o CEP, busca o endereço e preenche os campos marcados com
  // Config.preenchidoPeloCep. Ver lib/flow/cep.ts.
  { value: "cep", label: "CEP (busca o endereço)" },
] as const;

// Tipos cuja UI de edição precisa de um editor de opções estáticas (Opcoes).
export const CHOICE_FIELD_TYPES = ["selecao", "checkbox", "dropdown"] as const;

export function fieldTypeLabel(tipo: string) {
  return FIELD_TYPES.find((t) => t.value === tipo)?.label ?? tipo;
}

export interface VisibleIfConfig {
  fieldId: string;
  operator: "equals" | "not_equals" | "filled" | "not_filled";
  value?: string;
}

export interface FieldConfig {
  // Campos do tipo "contrato". contratoTexto aceita marcadores {{nome do campo}}, que são
  // substituídos pelas respostas dos outros campos do mesmo formulário na hora de gerar o PDF.
  contratoTexto?: string;
  titulo?: string;
  signatarioNomeFieldId?: string;
  signatarioEmailFieldId?: string;
  signatarioCpfFieldId?: string;
  tabelaReferencia?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  maxEstrelas?: number;
  visibleIf?: VisibleIfConfig;

  // Rematrícula (2026-09) — preenchimento automático a partir do cadastro.
  //
  // A chave fica no campo, e não numa lista fixa de nomes de campo, porque cada escola batiza
  // os campos como quiser ("Nome do aluno", "Aluno(a)", "Nome da criança"). Casar por rótulo
  // quebraria no dia em que alguém renomeasse um campo.
  autoPreenchimento?: AutoFillKey;

  /** Campo somente leitura para quem responde (valor da mensalidade, turma, desconto). */
  travado?: boolean;

  /**
   * Texto que o campo já traz preenchido.
   *
   * Existe por causa de um detalhe do contrato: marcador vazio NÃO vira string em branco — o
   * renderizador barra o envio, porque "desconto concedido: " sem nada é o tipo de buraco que
   * passa despercebido e vira discussão depois. Um campo que na rematrícula não se aplica
   * precisa dizer isso com todas as letras ("Não se aplica"), e não ficar vazio.
   */
  valorPadrao?: string;

  /**
   * Parte do endereço que este campo recebe quando o CEP é preenchido.
   *
   * Fica no campo que RECEBE, e não numa lista de destinos no campo do CEP, pelo mesmo motivo de
   * autoPreenchimento: cada escola divide o endereço de um jeito — uma tem "Endereço completo",
   * outra tem rua, bairro, cidade e UF separados. Marcar no destino atende as duas sem inventar
   * um encaixe fixo.
   */
  preenchidoPeloCep?: CepParte;

  /**
   * Onde esta resposta é gravada no cadastro, quando a gestão aprova.
   *
   * O caminho de volta do preenchimento automático: aquele traz o cadastro para o formulário,
   * este leva a correção da família de volta para o cadastro. Ver lib/registry/campos-do-cadastro.
   */
  gravarEm?: string;
}

// Chaves de preenchimento automático. Espelham DadosRematriculaDto no backend — quem adicionar
// um campo lá precisa adicionar aqui e em AUTO_FILL_OPTIONS abaixo.
export const AUTO_FILL_KEYS = [
  "nome_aluno",
  "data_nascimento_aluno",
  "turma_atual",
  "turma_proximo_ano",
  "nome_responsavel",
  "cpf_responsavel",
  "email_responsavel",
  "telefone_responsavel",
  "valor_atual",
  "percentual_reajuste",
  "valor_proximo_ano",
  "valor_anuidade",
  "dia_vencimento",
  "cep",
  "logradouro",
  "numero_endereco",
  "complemento",
  "bairro",
  "cidade",
  "uf",
  "endereco_completo",
  "cidade_uf",
] as const;

export type AutoFillKey = (typeof AUTO_FILL_KEYS)[number];

export type { CepParte };

export const AUTO_FILL_OPTIONS: { value: AutoFillKey; label: string }[] = [
  { value: "nome_aluno", label: "Nome do aluno" },
  { value: "data_nascimento_aluno", label: "Data de nascimento do aluno" },
  { value: "turma_atual", label: "Turma atual" },
  { value: "turma_proximo_ano", label: "Turma do próximo ano" },
  { value: "nome_responsavel", label: "Nome do responsável" },
  { value: "cpf_responsavel", label: "CPF do responsável" },
  { value: "email_responsavel", label: "E-mail do responsável" },
  { value: "telefone_responsavel", label: "Telefone do responsável" },
  { value: "valor_atual", label: "Mensalidade atual" },
  { value: "percentual_reajuste", label: "Percentual de reajuste" },
  { value: "valor_proximo_ano", label: "Mensalidade do próximo ano" },
  { value: "valor_anuidade", label: "Anuidade do próximo ano (12x)" },
  { value: "dia_vencimento", label: "Dia de vencimento" },
  { value: "cep", label: "CEP" },
  { value: "logradouro", label: "Rua / logradouro" },
  { value: "numero_endereco", label: "Número do endereço" },
  { value: "complemento", label: "Complemento" },
  { value: "bairro", label: "Bairro" },
  { value: "cidade", label: "Cidade" },
  { value: "uf", label: "Estado (UF)" },
  { value: "endereco_completo", label: "Endereço completo (rua e bairro)" },
  { value: "cidade_uf", label: "Cidade e estado" },
];

// "Fonte de dados" (F1) não tem endpoint próprio de vínculo — o mecanismo dedicado
// (FormFieldReferenceBindingService) existe no backend mas nenhum controller o expõe.
// Guardamos a tabela escolhida (e agora min/max/minLength/maxLength/maxEstrelas/
// visibleIf) dentro de FormField.Config (coluna JSON livre já existente).
export function encodeFieldConfig(config: FieldConfig): string | null {
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  );
  if (Object.keys(cleaned).length === 0) return null;
  return JSON.stringify(cleaned);
}
export function decodeFieldConfig(config: string | null | undefined): FieldConfig {
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

// Opcoes (lista de escolhas) é sempre um array JSON de strings — mesmo formato usado
// pro Valor de um item de campo "checkbox" (ver use-form-fill.ts).
export function encodeOpcoes(opcoes: string[]): string | null {
  const cleaned = opcoes.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}
export function decodeOpcoes(opcoes: string | null | undefined): string[] {
  if (!opcoes) return [];
  try {
    const parsed = JSON.parse(opcoes);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function useCreateFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      label: string;
      tipo: string;
      ordem: number;
      obrigatorio: boolean;
      config?: string | null;
      opcoes?: string | null;
    }) => {
      const result = await flowApi.POST("/api/forms/{formId}/fields", {
        params: { path: { formId } },
        body: {
          formId,
          label: input.label,
          tipo: input.tipo,
          ordem: input.ordem,
          obrigatorio: input.obrigatorio,
          ativo: true,
          config: input.config ?? null,
          opcoes: input.opcoes ?? null,
        },
      });
      // Devolve o campo criado: quem liga "este formulário gera contrato" precisa do id para
      // abrir a configuração do campo na sequência, sem esperar a lista recarregar.
      const data = unwrapApiResponse(result, "Não foi possível criar o campo.");
      return data as unknown as FormFieldDto;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}

export function useUpdateFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field: FormFieldDto) => {
      const result = await flowApi.PUT("/api/forms/{formId}/fields/{id}", {
        params: { path: { formId, id: field.id } },
        body: {
          id: field.id,
          formId,
          label: field.label,
          tipo: field.tipo,
          ordem: field.ordem,
          obrigatorio: field.obrigatorio,
          ativo: field.ativo,
          config: field.config,
          opcoes: field.opcoes,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}

/**
 * Grava a sequência inteira dos campos de uma vez. Usado pelo arrastar e pelas setas.
 *
 * A lista muda na tela antes de o servidor responder: esperar a resposta a cada arrasto faria o
 * campo voltar para o lugar antigo por um instante. Se o servidor recusar, a lista volta ao que era.
 */
export function useReordenarCampos(formId: string) {
  const queryClient = useQueryClient();
  const chave = ["forms", formId];

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await flowApi.PUT("/api/forms/{formId}/fields/ordem", {
        params: { path: { formId } },
        body: { ids },
      });
      unwrapApiResponse(result, "Não foi possível reordenar os campos.");
    },
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<FormDto>(chave);

      if (anterior?.campos) {
        const porId = new Map(anterior.campos.map((c) => [c.id, c]));
        const pedidos = ids.map((id) => porId.get(id)).filter((c): c is FormFieldDto => !!c);
        const restantes = anterior.campos.filter((c) => !ids.includes(c.id));
        const campos = [...pedidos, ...restantes].map((c, i) => ({ ...c, ordem: i + 1 }));
        queryClient.setQueryData<FormDto>(chave, { ...anterior, campos });
      }

      return { anterior };
    },
    onError: (_erro, _ids, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chave, contexto.anterior);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chave }),
  });
}

export function useDeleteFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await flowApi.DELETE("/api/forms/{formId}/fields/{id}", {
        params: { path: { formId, id } },
      });
      unwrapApiResponse(result, "Não foi possível remover o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}
