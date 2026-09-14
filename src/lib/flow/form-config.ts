// Configuração do formulário inteiro (2026-09), guardada em Form.Config como JSON.
//
// Separado de FieldConfig de propósito: aquilo é por campo, isto vale para o formulário todo.
// Coluna JSON livre pelo mesmo motivo de lá — estas regras são poucas e mudam mais rápido do que
// vale a pena migrar o schema a cada uma.

export type TipoDeFormulario = "matricula" | "rematricula" | "outro";

export interface FormConfig {
  /**
   * Matrícula, rematrícula ou outro. Vira a tag de cada envio na caixa de envios.
   *
   * Opcional: sem marcação, o sistema deduz (ver tipoDoFormulario) — os formulários que já existem
   * ganham a tag sem ninguém precisar abrir um por um.
   */
  tipo?: TipoDeFormulario;

  /**
   * O formulário só aparece depois que a família se identifica.
   *
   * Sem isto, o bloco de identificação fica no topo mas o resto do formulário já está à mostra —
   * e quem preenche à mão antes de buscar tem tudo sobrescrito quando a busca acha o aluno.
   */
  exigirIdentificacao?: boolean;

  /**
   * Deixa preencher mesmo quando a busca não encontra.
   *
   * Ligado por padrão, e a razão é concreta: nome com grafia diferente da matrícula, data digitada
   * errada, criança cadastrada com o nome do pai. Desligado, essas famílias ficam sem conseguir
   * enviar nada e a escola descobre pelo telefone.
   */
  permitirSemEncontrar?: boolean;
}

export function decodeFormConfig(config: string | null | undefined): FormConfig {
  if (!config) return {};
  try {
    const parsed = JSON.parse(config);
    return typeof parsed === "object" && parsed !== null ? (parsed as FormConfig) : {};
  } catch {
    // Config inválido não deve derrubar o formulário público: sem regra é o comportamento antigo,
    // que funciona.
    return {};
  }
}

export function encodeFormConfig(config: FormConfig): string | null {
  const limpo = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== undefined && v !== null)
  );
  return Object.keys(limpo).length === 0 ? null : JSON.stringify(limpo);
}
