/** Rótulo de quem foi aprovado sem turma do próximo ano definida. */
export const SEM_TURMA = "Sem turma";

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-xs text-muted-foreground">Mensalidades aprovadas</p>
        <p className="font-mono text-lg font-semibold tabular-nums">{moeda(totalMensal)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">No ano (12x)</p>
        <p className="font-mono text-sm tabular-nums">{moeda(totalMensal * 12)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{rotuloAprovadas}</p>
        <p className="font-mono text-sm tabular-nums">{aprovadas}</p>
      </div>

      {porTurma.map(([turma, quantidade], i) => {
        // Aprovada sem turma é a única que pede ação: a escola precisa definir a turma antes de
        // contar a vaga. Por isso só ela muda de cor.
        const alerta = turma === SEM_TURMA;
        return (
          <div key={turma} className={i === 0 ? "border-l border-border pl-6" : undefined}>
            <p className={`text-xs ${alerta ? "text-destructive" : "text-muted-foreground"}`}>
              {turma}
            </p>
            <p className={`font-mono text-sm tabular-nums ${alerta ? "text-destructive" : ""}`}>
              {quantidade}
            </p>
          </div>
        );
      })}

      <p className="basis-full text-xs text-muted-foreground">
        Soma o campo <strong>{rotuloValor}</strong> das respostas concluídas.
        {rotuloTurma && (
          <>
            {" "}
            As turmas vêm do campo <strong>{rotuloTurma}</strong>.
          </>
        )}{" "}
        Pendentes ficam de fora — ainda podem ser reprovadas.
      </p>
    </div>
  );
}
