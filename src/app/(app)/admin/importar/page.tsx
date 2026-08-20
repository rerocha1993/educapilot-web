"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBulkImport, type ImportTipo } from "@/lib/kernel/use-bulk-import";

const TIPOS: { value: ImportTipo; label: string; formato: string; accept: string }[] = [
  {
    value: "alunos",
    label: "Alunos",
    formato: "Arquivo .csv com ponto-e-vírgula, codificação Windows-1252, colunas: Nome completo; Data de nascimento; Nome da turma (turma precisa já existir).",
    accept: ".csv",
  },
  {
    value: "turmas",
    label: "Turmas",
    formato: "Planilha .xlsx, nome da turma na coluna A a partir da linha 2.",
    accept: ".xlsx",
  },
];

export default function ImportarPage() {
  const [tipo, setTipo] = useState<ImportTipo>("alunos");
  const [file, setFile] = useState<File | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImport();

  const tipoInfo = TIPOS.find((t) => t.value === tipo)!;

  async function handleImport() {
    if (!file) return;
    setResultMessage(null);
    try {
      const result = await bulkImport.mutateAsync({ tipo, file });
      setResultMessage(result.message);
      toast.success("Importação concluída.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Importação em massa</h1>
        <p className="text-sm text-muted-foreground">
          Envio direto de arquivo — sem preview de linhas nem validação (ver
          disclaimer abaixo).
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">O que importar</label>
          <Select value={tipo} onValueChange={(v) => v && setTipo(v as ImportTipo)}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => tipoInfo.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{tipoInfo.formato}</p>
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">Arquivo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={tipoInfo.accept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs"
          />
        </div>

        <Button onClick={handleImport} disabled={!file || bulkImport.isPending} className="self-start">
          {bulkImport.isPending ? "Importando..." : `Importar ${tipoInfo.label.toLowerCase()}`}
        </Button>

        {resultMessage && (
          <div className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
            {resultMessage}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        O wireframe A8 mostra um assistente de 3 passos (arquivo → conferir linha a
        linha com avisos/duplicados → confirmar → baixar erros). O backend não tem
        nada disso — só recebe o arquivo inteiro e devolve uma mensagem única de
        sucesso/erro no final, sem relatório por linha. Alunos duplicados (mesmo nome
        + data de nascimento) são ignorados silenciosamente pelo backend, sem aparecer
        em lugar nenhum da resposta.
      </p>
    </div>
  );
}
