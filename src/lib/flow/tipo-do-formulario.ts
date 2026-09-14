import { decodeFormConfig, type TipoDeFormulario } from "./form-config";
import { decodeFieldConfig } from "./use-form-fields";

export const ROTULO_DO_TIPO: Record<TipoDeFormulario, string> = {
  matricula: "Matrícula",
  rematricula: "Rematrícula",
  outro: "Outro",
};

/**
 * Se o formulário é de matrícula ou de rematrícula.
 *
 * Vale o que a escola marcou no formulário. Sem marcação, deduz: formulário com preenchimento
 * automático pelos dados do aluno (a identificação "Buscar meus dados") só existe para quem já é
 * aluno, então é rematrícula; depois disso, decide o nome. Nulo quando não é nenhum dos dois.
 */
export function tipoDoFormulario(form: {
  nome: string;
  config: string | null;
  campos?: { config: string | null }[] | null;
}): TipoDeFormulario | null {
  const marcado = decodeFormConfig(form.config).tipo;
  if (marcado) return marcado;

  if ((form.campos ?? []).some((c) => !!decodeFieldConfig(c.config).autoPreenchimento)) return "rematricula";
  if (/rematr[ií]cula/i.test(form.nome)) return "rematricula";
  if (/matr[ií]cula/i.test(form.nome)) return "matricula";
  return null;
}
