"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useImportTuitionSpreadsheet,
  type TuitionImportResult,
} from "@/lib/finance/use-tuition-import";

/**
 * Importa a planilha de mensalidades do Agenda Edu e vincula o valor a cada aluno.
 */
export function TuitionImportCard() {
  const importar = useImportTuitionSpreadsheet();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<TuitionImportResult | null>(null);

  async function handleImportar() {
    if (!arquivo) return;
    setResultado(null);

    try {
      const r = await importar.mutateAsync(arquivo);
      setResultado(r);

      if (r.sucesso) {
        toast.success("Mensalidades importadas.");
        // Limpa o arquivo escolhido: deixá-lo selecionado convida a clicar de novo sem
        // querer, e uma segunda importação do mesmo arquivo não faz nada de útil.
        setArquivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        toast.error(r.erro ?? "A importação falhou.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">Mensalidades (Agenda Edu)</h2>
        <p className="mt-1 text-[13.5px] leading-[1.55] text-pretty text-muted-foreground">
          Relatório de cobranças recorrentes exportado do Agenda Edu (.xls ou .xlsx). Cada aluno é
          identificado pelo id do Agenda Edu, não pelo nome — então reimportar atualiza os valores
          em vez de duplicar.
        </p>
      </div>

      <div className="flex flex-col gap-[5px]">
        <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Arquivo</label>
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Importe primeiro turmas e alunos do Agenda Edu — a planilha só consegue vincular o valor
          a quem já está cadastrado.
        </p>
      </div>

      <Button onClick={handleImportar} disabled={!arquivo || importar.isPending} className="w-full sm:w-auto sm:self-start">
        {importar.isPending ? "Importando..." : "Importar mensalidades"}
      </Button>

      {resultado && <ResultadoImportacao resultado={resultado} />}
    </div>
  );
}

function ResultadoImportacao({ resultado }: { resultado: TuitionImportResult }) {
  if (!resultado.sucesso) {
    return (
      <div className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm break-words text-destructive-soft-foreground">
        {resultado.erro ?? "A importação falhou."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-success-border bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
      <div>
        <strong className="font-mono tabular-nums">{resultado.criados}</strong> mensalidades criadas,{" "}
        <strong className="font-mono tabular-nums">{resultado.atualizados}</strong> atualizadas
        {resultado.semAlteracao > 0 && (
          <> e <span className="font-mono tabular-nums">{resultado.semAlteracao}</span> sem mudança</>
        )}
        .
      </div>

      {resultado.ignorados.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">
            <span className="font-mono tabular-nums">{resultado.ignorados.length}</span> linha(s) não importada(s)
            — ver motivos
          </summary>
          <ul className="mt-1 list-disc pl-4 break-words">
            {resultado.ignorados.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      )}

      {resultado.alunosSemMensalidade.length > 0 && (
        <details className="text-xs">
          {/* Costuma apontar justamente quem precisa de atenção: bolsista, aluno que entrou
              depois da exportação, ou alguém que saiu e ninguém deu baixa. */}
          <summary className="cursor-pointer">
            <span className="font-mono tabular-nums">{resultado.alunosSemMensalidade.length}</span> aluno(s)
            cadastrado(s) sem mensalidade na planilha
          </summary>
          <ul className="mt-1 list-disc pl-4 break-words">
            {resultado.alunosSemMensalidade.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
