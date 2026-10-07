import type { VisibleIfConfig } from "./use-form-fields";

/**
 * Lógica condicional dos campos ("só mostrar este campo se...").
 *
 * Mora aqui, e não em cada tela, porque o preenchimento interno e o link público tinham cópias
 * iguais — e o mesmo defeito nas duas: a resposta de "caixas de seleção" é uma lista
 * (["item2","item4"]), e a condição "é igual a item4" comparava a lista inteira com o texto, então
 * nunca batia. A regra espelha AvaliarVisibilidade em FormResponseService.cs: quem mudar uma
 * muda a outra, senão o servidor cobra um campo que a tela escondeu.
 */

/** Os valores de uma resposta: a lista da caixa de seleção, as escolhas da tabela, ou o texto. */
export function valoresDaResposta(valor: string | null | undefined): string[] {
  if (!valor || valor.trim() === "") return [];
  const texto = valor.trim();

  if (texto.startsWith("[") || texto.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(texto);
      const lista = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? Object.values(parsed)
          : null;
      if (lista) return lista.filter((v): v is string => typeof v === "string" && v.trim() !== "");
    } catch {
      // Texto que só começa com colchete: vale como texto.
    }
  }

  return [texto];
}

/**
 * Os valores de comparação da condição.
 *
 * Uma lista JSON quando o construtor marcou mais de uma opção ("item2 ou item4"); texto simples
 * nas condições antigas, de um valor só.
 */
export function valoresDaCondicao(valor: string | null | undefined): string[] {
  return valoresDaResposta(valor);
}

/** Igualdade de quem preenche: sem diferença de maiúsculas nem de espaço nas pontas. */
function normalizar(v: string) {
  return v.trim().toLocaleLowerCase("pt-BR");
}

export function condicaoAtendida(
  condicao: VisibleIfConfig | undefined,
  respostas: Record<string, string>
): boolean {
  if (!condicao) return true;

  const resposta = valoresDaResposta(respostas[condicao.fieldId]).map(normalizar);
  const preenchido = resposta.length > 0;

  // "É igual a" com várias opções marcadas no construtor é "qualquer uma delas"; numa caixa de
  // seleção basta uma das escolhidas bater.
  const alvo = valoresDaCondicao(condicao.value).map(normalizar);
  const bate = alvo.some((v) => resposta.includes(v));

  switch (condicao.operator) {
    case "filled":
      return preenchido;
    case "not_filled":
      return !preenchido;
    case "equals":
      return bate;
    case "not_equals":
      return !bate;
    default:
      return true;
  }
}
