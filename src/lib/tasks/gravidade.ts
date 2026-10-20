// Gravidade da ocorrência (contrato da Ficha do aluno v2, seção 1).
// Ocorrências antigas não têm gravidade: a API omite o campo e a tela mostra "Não informada".
export const GRAVIDADES = ["Leve", "Moderada", "Grave"] as const;
export type Gravidade = (typeof GRAVIDADES)[number];

export const GRAVIDADE_NAO_INFORMADA = "Não informada";

export const GRAVIDADE_DESCRICAO: Record<Gravidade, string> = {
  Leve: "Sem consequência; conversa e orientação resolvem.",
  Moderada: "Pede acompanhamento e, em geral, avisar a família.",
  Grave: "Risco ou conduta séria; a gestão precisa agir.",
};

// Cor de cada gravidade nos gráficos (variáveis do tema: valem no claro e no escuro).
export const GRAVIDADE_COR: Record<Gravidade | "semGravidade", string> = {
  Leve: "var(--primary)",
  Moderada: "var(--warning)",
  Grave: "var(--destructive)",
  semGravidade: "var(--muted-foreground)",
};

export function gravidadeValida(valor: string | null | undefined): Gravidade | null {
  return GRAVIDADES.find((g) => g === valor) ?? null;
}
