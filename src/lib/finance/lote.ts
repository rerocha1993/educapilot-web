/**
 * Ação em lote feita no cliente: não existe endpoint que baixe várias receitas ou despesas de uma
 * vez, então cada item vai numa chamada própria (as mesmas rotas `/baixar` da baixa individual, com
 * as mesmas regras do servidor: mês fechado, conta inativa, juros e multa da escola).
 *
 * Um item que falha não derruba os outros: o resultado diz quais deram certo e qual foi o motivo de
 * cada falha, para a tela manter marcados só os que faltam. Roda poucas chamadas ao mesmo tempo para
 * não sobrecarregar a API.
 */
export interface FalhaDoLote {
  id: string;
  mensagem: string;
}

export interface ResultadoDoLote {
  feitos: string[];
  falhas: FalhaDoLote[];
}

const CHAMADAS_AO_MESMO_TEMPO = 3;

export async function executarEmLote(
  ids: string[],
  acao: (id: string) => Promise<unknown>,
  onProgresso?: (concluidos: number, total: number) => void
): Promise<ResultadoDoLote> {
  const resultado: ResultadoDoLote = { feitos: [], falhas: [] };
  let proximo = 0;
  let concluidos = 0;

  async function trabalhador() {
    while (proximo < ids.length) {
      const id = ids[proximo++];
      try {
        await acao(id);
        resultado.feitos.push(id);
      } catch (err) {
        resultado.falhas.push({ id, mensagem: err instanceof Error ? err.message : "Não foi possível concluir." });
      }
      concluidos += 1;
      onProgresso?.(concluidos, ids.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CHAMADAS_AO_MESMO_TEMPO, ids.length) }, trabalhador));
  return resultado;
}
