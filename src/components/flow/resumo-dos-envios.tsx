/** Rótulo de quem foi aprovado sem turma do próximo ano definida. */
export const SEM_TURMA = "Sem turma";

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cartão escuro do modelo ("Caixa de envios"): os tons abaixo só existem sobre esse fundo e não
// têm token na paleta clara — por isso vêm em hex, direto da entrega de design.
const ROTULO = "text-xs text-[#A9A2B8]";
const NUMERO = "mt-1.5 font-heading text-[27px] leading-none font-semibold tracking-[-.03em] font-mono tabular-nums";

/**
 * Resumo dos envios em tela.
 *
 * O cartão mostra só o que a seleção tem. Contagem de envios todo formulário tem, então ela é
 * sempre exibida; dinheiro e turma existem em uns e não em outros, e por isso chegam como blocos
 * opcionais — uma autorização de passeio não deve ganhar um "R$ 0,00" para preencher o desenho.
 * Os rótulos vêm dos campos dos próprios formulários, nunca de um nome fixo de matrícula.
 */
export function ResumoDosEnvios({
  escopo,
  total,
  concluidas,
  aguardando,
  dinheiro,
  turmas,
}: {
  /** Quais formulários estão em tela ("Todos os formulários", o nome de um, "3 formulários"). */
  escopo: string;
  total: number;
  concluidas: number;
  aguardando: number;
  /** Só quando algum formulário da seleção tem campo de valor. Vários somam no mesmo total. */
  dinheiro: { total: number; rotulo: string; formularios: number } | null;
  /** Só quando algum formulário da seleção tem campo de turma. */
  turmas: { rotulo: string; itens: [string, number][] } | null;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-[linear-gradient(135deg,#17141B,#2A2333)] px-5 py-5 text-white">
      <div className="flex flex-col gap-4">
        <p className="text-[11.5px] font-bold tracking-[.16em] text-[#8F87A0] uppercase">
          {escopo}
        </p>

        <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))]">
          {dinheiro && (
            <>
              <div>
                <p className={ROTULO}>{dinheiro.rotulo}</p>
                <p className={`${NUMERO} text-[#FFB673]`}>{moeda(dinheiro.total)}</p>
              </div>
              <div>
                <p className={ROTULO}>No ano (12x)</p>
                <p className={NUMERO}>{moeda(dinheiro.total * 12)}</p>
              </div>
            </>
          )}
          <div>
            <p className={ROTULO}>Envios</p>
            <p className={NUMERO}>{total}</p>
          </div>
          <div>
            <p className={ROTULO}>Concluídas</p>
            <p className={NUMERO}>{concluidas}</p>
          </div>
          <div>
            <p className={ROTULO}>Aguardando</p>
            <p className={NUMERO}>{aguardando}</p>
          </div>
        </div>
      </div>

      {turmas && turmas.itens.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {turmas.itens.map(([turma, quantidade]) => {
            // Concluída sem turma é a única que pede ação: a escola precisa definir a turma antes
            // de contar a vaga. Por isso só ela muda de cor.
            const alerta = turma === SEM_TURMA;
            return (
              <span
                key={turma}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px] ${
                  alerta
                    ? "border-destructive-border/40 bg-destructive/25 text-white"
                    : "border-white/10 bg-white/[.07]"
                }`}
              >
                {turma}
                <strong className="font-mono font-semibold tabular-nums text-[#FFB673]">
                  {quantidade}
                </strong>
              </span>
            );
          })}
        </div>
      )}

      {(dinheiro || turmas) && (
        <p className="text-[11.5px] leading-[1.55] text-[#8F87A0]">
          {dinheiro && (
            <>
              Soma o campo{" "}
              <strong className="font-semibold text-[#A9A2B8]">{dinheiro.rotulo}</strong>
              {dinheiro.formularios > 1 && (
                <> dos {dinheiro.formularios} formulários selecionados que o têm</>
              )}{" "}
              nas respostas concluídas — pendentes ficam de fora, ainda podem ser reprovadas.{" "}
            </>
          )}
          {turmas && (
            <>
              As turmas vêm do campo{" "}
              <strong className="font-semibold text-[#A9A2B8]">{turmas.rotulo}</strong> e contam só
              as concluídas.
            </>
          )}
        </p>
      )}
    </div>
  );
}
