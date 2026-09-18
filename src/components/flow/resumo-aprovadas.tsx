/** Rótulo de quem foi aprovado sem turma do próximo ano definida. */
export const SEM_TURMA = "Sem turma";

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cartão escuro do modelo ("Caixa de envios"): os tons abaixo só existem sobre esse fundo e não
// têm token na paleta clara — por isso vêm em hex, direto da entrega de design.
const ROTULO = "text-xs text-[#A9A2B8]";
const NUMERO = "mt-1.5 font-heading text-[27px] leading-none font-semibold tracking-[-.03em] font-mono tabular-nums";

/**
 * Resumo do que já foi aprovado na Caixa de envios.
 *
 * Cada turma é mais uma coluna na mesma linha dos totais, com o mesmo rótulo pequeno e o mesmo
 * número em fonte mono — lê-se como parte do placar, e não como um bloco à parte. A linha fina
 * antes da primeira turma separa o que é total do que é quebra por turma.
 */
export function ResumoAprovadas({
  totalMensal,
  aprovadas,
  porTurma,
  rotuloValor,
  rotuloTurma,
  rotuloAprovadas = "Rematrículas aprovadas",
}: {
  totalMensal: number;
  aprovadas: number;
  porTurma: [string, number][];
  rotuloValor: string;
  rotuloTurma: string | null;
  /** Muda com o filtro: com "Todos", o total junta matrículas e rematrículas. */
  rotuloAprovadas?: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-[linear-gradient(135deg,#17141B,#2A2333)] px-5 py-5 text-white">
      <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))]">
        <div>
          <p className={ROTULO}>Mensalidades aprovadas</p>
          <p className={`${NUMERO} text-[#FFB673]`}>{moeda(totalMensal)}</p>
        </div>
        <div>
          <p className={ROTULO}>No ano (12x)</p>
          <p className={NUMERO}>{moeda(totalMensal * 12)}</p>
        </div>
        <div>
          <p className={ROTULO}>{rotuloAprovadas}</p>
          <p className={NUMERO}>{aprovadas}</p>
        </div>
      </div>

      {porTurma.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {porTurma.map(([turma, quantidade]) => {
            // Aprovada sem turma é a única que pede ação: a escola precisa definir a turma antes de
            // contar a vaga. Por isso só ela muda de cor.
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

      <p className="text-[11.5px] leading-[1.55] text-[#8F87A0]">
        Soma o campo <strong className="font-semibold text-[#A9A2B8]">{rotuloValor}</strong> das
        respostas concluídas.
        {rotuloTurma && (
          <>
            {" "}
            As turmas vêm do campo{" "}
            <strong className="font-semibold text-[#A9A2B8]">{rotuloTurma}</strong>.
          </>
        )}{" "}
        Pendentes ficam de fora — ainda podem ser reprovadas.
      </p>
    </div>
  );
}
