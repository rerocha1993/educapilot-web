// Destinos que um campo de formulário pode alimentar no cadastro (2026-09).
//
// Espelha CampoDoCadastro no backend, que é quem de fato aplica os valores na aprovação. Quem
// acrescentar um destino lá precisa acrescentar aqui — do contrário a opção some da tela (ou, pior,
// aparece na tela e o backend a ignora calado).

export const CAMPO_CADASTRO_OPTIONS: { value: string; label: string; grupo: string }[] = [
  { value: "endereco.cep", label: "CEP", grupo: "Endereço" },
  { value: "endereco.logradouro", label: "Rua / logradouro", grupo: "Endereço" },
  { value: "endereco.numero", label: "Número", grupo: "Endereço" },
  { value: "endereco.complemento", label: "Complemento", grupo: "Endereço" },
  { value: "endereco.bairro", label: "Bairro", grupo: "Endereço" },
  { value: "endereco.cidade", label: "Cidade", grupo: "Endereço" },
  { value: "endereco.uf", label: "Estado (UF)", grupo: "Endereço" },

  { value: "responsavel.nome", label: "Nome", grupo: "Responsável" },
  { value: "responsavel.cpf", label: "CPF", grupo: "Responsável" },
  { value: "responsavel.email", label: "E-mail", grupo: "Responsável" },
  { value: "responsavel.telefone", label: "Telefone", grupo: "Responsável" },
];

export function rotuloDoDestino(chave: string | undefined): string | null {
  if (!chave) return null;
  const opcao = CAMPO_CADASTRO_OPTIONS.find((o) => o.value === chave);
  return opcao ? `${opcao.grupo} · ${opcao.label}` : chave;
}
