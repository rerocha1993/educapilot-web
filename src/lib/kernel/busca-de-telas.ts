import type { LucideIcon } from "lucide-react";

/**
 * Uma tela que a busca do topo pode abrir.
 *
 * `ferramenta` é o nome do módulo ("Fluxos", "Rotina") e `grupo` o subtítulo da barra lateral
 * ("Quadro", "Tesouraria"): os dois entram na busca, para "financeiro" achar as telas do Financeiro
 * mesmo que o nome da tela não o cite.
 */
export interface TelaBuscavel {
  href: string;
  label: string;
  ferramenta: string;
  grupo?: string;
  icon?: LucideIcon;
}

/**
 * Palavras que as pessoas digitam e que não estão no nome da tela, por href. Só o que é
 * comum de verdade: o resto a busca acha pelo nome, pela ferramenta e pelo grupo.
 */
const SINONIMOS: Record<string, string> = {
  "/": "presenca frequencia alunos presentes faltas",
  "/admin/contratos": "contrato assinatura matricula documento",
  "/admin/usuarios": "usuario login senha acesso funcionario professor",
  "/admin/responsaveis": "pai mae familia responsavel contato",
  "/admin/alunos": "estudante crianca",
  "/admin/turmas": "classe sala",
  "/ocorrencias": "incidente registro comportamento",
  "/rh/ponto": "ponto batida horario",
  "/matriculas": "funil leads familias interessados",
  "/matriculas/anuncios": "meta facebook instagram campanha",
};

/** Minúsculas, sem acento, sem pontuação: "Relatórios" e "relatorios" são a mesma palavra. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tira o "s" do plural: "chamadas" acha "Chamada", "contratos" acha "Contrato". */
function singular(palavra: string): string {
  return palavra.length > 3 && palavra.endsWith("s") ? palavra.slice(0, -1) : palavra;
}

function palavrasDe(texto: string): string[] {
  return normalizarBusca(texto).split(" ").filter(Boolean).map(singular);
}

/**
 * Pontua uma tela para o que foi digitado; 0 = não casa. Toda palavra digitada precisa casar com
 * alguma palavra da tela (começo de palavra), e o nome da tela pesa mais que a ferramenta, o grupo
 * e os sinônimos.
 */
export function pontuar(tela: TelaBuscavel, consulta: string): number {
  const digitadas = palavrasDe(consulta);
  if (digitadas.length === 0) return 0;

  const nome = palavrasDe(tela.label);
  const contexto = palavrasDe(`${tela.ferramenta} ${tela.grupo ?? ""}`);
  const sinonimos = palavrasDe(SINONIMOS[tela.href] ?? "");

  let total = 0;
  for (const palavra of digitadas) {
    if (nome.some((p) => p === palavra)) total += 10;
    else if (nome.some((p) => p.startsWith(palavra))) total += 7;
    else if (sinonimos.some((p) => p.startsWith(palavra))) total += 4;
    else if (contexto.some((p) => p.startsWith(palavra))) total += 3;
    else return 0;
  }

  // Quem digitou o nome inteiro, na ordem, vem antes.
  if (normalizarBusca(tela.label).startsWith(normalizarBusca(consulta))) total += 5;
  return total;
}

/** As telas que casam, da melhor para a pior; em empate, a ordem do menu. */
export function buscarTelas(telas: readonly TelaBuscavel[], consulta: string, limite = 8): TelaBuscavel[] {
  return telas
    .map((tela, ordem) => ({ tela, ordem, pontos: pontuar(tela, consulta) }))
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map((r) => r.tela);
}
