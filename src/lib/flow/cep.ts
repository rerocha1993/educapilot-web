// Busca de endereço por CEP (2026-09).
//
// ViaCEP: público, sem chave, sem cadastro e mantido há mais de uma década. A consulta sai do
// navegador de quem preenche, e não do nosso servidor, por três razões: não gasta requisição da
// nossa infraestrutura, não coloca o EducaPilot como intermediário de um serviço que pode ficar
// fora do ar, e o endereço que a família digita não precisa passar por nós antes de aparecer na
// tela dela.

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Partes do endereço que um campo pode receber. Espelha CEP_PARTE_OPTIONS abaixo. */
export const CEP_PARTES = [
  "logradouro",
  "bairro",
  "cidade",
  "uf",
  "cidade_uf",
  "endereco_completo",
] as const;

export type CepParte = (typeof CEP_PARTES)[number];

export const CEP_PARTE_OPTIONS: { value: CepParte; label: string }[] = [
  { value: "endereco_completo", label: "Endereço completo (rua e bairro)" },
  { value: "logradouro", label: "Rua / logradouro" },
  { value: "bairro", label: "Bairro" },
  { value: "cidade", label: "Cidade" },
  { value: "uf", label: "Estado (UF)" },
  { value: "cidade_uf", label: "Cidade e estado" },
];

/** Só os dígitos. O que a família digita vem com ponto, hífen e espaço em qualquer combinação. */
export function apenasDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Formata para 00000-000 enquanto digita, sem atrapalhar quem apaga. */
export function formatarCep(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export class CepNaoEncontradoError extends Error {}

/**
 * Consulta o CEP.
 *
 * Erro de rede e CEP inexistente são distinguidos de propósito: "não encontramos esse CEP" pede
 * para a pessoa conferir o número, "não conseguimos consultar agora" pede para tentar de novo.
 * Tratar os dois igual manda a família corrigir um CEP que estava certo.
 */
export async function buscarCep(cep: string): Promise<EnderecoCep> {
  const digitos = apenasDigitos(cep);

  if (digitos.length !== 8) {
    throw new CepNaoEncontradoError("O CEP precisa ter 8 dígitos.");
  }

  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);

  if (!resposta.ok) {
    throw new Error("Não foi possível consultar o CEP agora.");
  }

  const dados = (await resposta.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  // ViaCEP responde 200 com { "erro": true } para CEP inexistente — checar só o status não basta.
  // Em algumas respostas o campo vem como a string "true", daí a comparação frouxa.
  if (dados.erro) {
    throw new CepNaoEncontradoError("CEP não encontrado. Confira o número digitado.");
  }

  return {
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.localidade ?? "",
    uf: dados.uf ?? "",
  };
}

/** Monta o texto que vai em cada campo, conforme a parte que ele recebe. */
export function valorDaParte(parte: CepParte, endereco: EnderecoCep): string {
  switch (parte) {
    case "logradouro":
      return endereco.logradouro;
    case "bairro":
      return endereco.bairro;
    case "cidade":
      return endereco.cidade;
    case "uf":
      return endereco.uf;
    case "cidade_uf":
      return [endereco.cidade, endereco.uf].filter(Boolean).join("/");
    case "endereco_completo":
      // Sem o número: é justamente o que a família ainda precisa digitar, e deixar o campo
      // terminando em vírgula deixa isso visualmente óbvio.
      return [endereco.logradouro, endereco.bairro].filter(Boolean).join(" - ");
    default:
      return "";
  }
}
