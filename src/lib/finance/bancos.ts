/**
 * Bancos que a escola pode escolher ao cadastrar uma conta.
 *
 * O backend guarda só o código em minúsculas (ver ContaFinanceira.Banco) — rótulo e cor moram
 * aqui porque são apresentação, e porque banco novo entra mexendo só neste arquivo. A cor é a da
 * marca, usada como faixa lateral do cartão: com seis contas na tela, a cor é o que faz a pessoa
 * achar a certa antes de ler o nome.
 */
export interface Banco {
  codigo: string;
  nome: string;
  cor: string;
}

export const BANCOS: Banco[] = [
  { codigo: "itau", nome: "Itaú", cor: "#EC7000" },
  { codigo: "bradesco", nome: "Bradesco", cor: "#CC092F" },
  { codigo: "santander", nome: "Santander", cor: "#EC0000" },
  { codigo: "sicoob", nome: "Sicoob", cor: "#00AE9D" },
  { codigo: "sicredi", nome: "Sicredi", cor: "#3FA110" },
  { codigo: "nubank", nome: "Nubank", cor: "#820AD1" },
  { codigo: "inter", nome: "Inter", cor: "#FF7A00" },
  { codigo: "bb", nome: "Banco do Brasil", cor: "#FAE128" },
  { codigo: "caixa", nome: "Caixa", cor: "#0070AF" },
  { codigo: "c6", nome: "C6 Bank", cor: "#242424" },
  { codigo: "asaas", nome: "Asaas", cor: "#1A73E8" },
  { codigo: "dinheiro", nome: "Dinheiro em espécie", cor: "#6B7280" },
  { codigo: "outro", nome: "Outro", cor: "#6B7280" },
];

export function banco(codigo: string | null | undefined): Banco {
  return BANCOS.find((b) => b.codigo === codigo) ?? BANCOS[BANCOS.length - 1];
}
