"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  baixarModeloDePonto,
  LIMITE_DE_ARQUIVO,
  useImportarPonto,
  type ResultadoDaImportacaoDePonto,
} from "@/lib/rh/use-rh";

import { Campo } from "./campo";

/**
 * Importar o ponto de uma planilha (CSV ou XLSX, no modelo do RH).
 *
 * Depois do envio o diálogo mostra o que entrou e, linha a linha, o que foi ignorado e por quê —
 * é por ali que a pessoa corrige a planilha e manda de novo.
 */
export function DialogImportarPonto({ onFechar }: { onFechar: () => void }) {
  const importar = useImportarPonto();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaImportacaoDePonto | null>(null);
  const [baixando, setBaixando] = useState(false);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0] ?? null;
    setResultado(null);
    if (!escolhido) {
      setArquivo(null);
      setErro(null);
      return;
    }
    if (escolhido.size > LIMITE_DE_ARQUIVO) {
      setArquivo(null);
      setErro("A planilha passa de 10 MB.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(escolhido.name)) {
      setArquivo(null);
      setErro("Envie uma planilha CSV ou XLSX.");
      return;
    }
    setArquivo(escolhido);
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      setErro("Escolha a planilha.");
      return;
    }

    try {
      const r = await importar.mutateAsync(arquivo);
      setResultado(r);
      setArquivo(null);
      if (entrada.current) entrada.current.value = "";
      if (r.ignorados.length === 0) toast.success("Planilha importada.");
      else toast.warning(`Planilha importada, com ${r.ignorados.length} linha(s) ignorada(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível importar a planilha.");
    }
  }

  async function modelo() {
    setBaixando(true);
    try {
      await baixarModeloDePonto();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o modelo.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !importar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar planilha de ponto</DialogTitle>
          <DialogDescription>
            Use o modelo do RH, em CSV ou XLSX. Dias que já têm lançamento são atualizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          <div>
            <Button type="button" variant="link" className="-ml-2.5 h-auto" disabled={baixando} onClick={modelo}>
              <Download />
              {baixando ? "Baixando..." : "Baixar modelo"}
            </Button>
          </div>

          <Campo id="ponto-planilha" rotulo="Planilha">
            <Input
              id="ponto-planilha"
              ref={entrada}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={escolher}
              aria-invalid={erro !== null}
              className="h-auto py-1.5 max-md:h-auto"
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          {resultado && (
            <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="size-4" />
                {resultado.importados} importado(s), {resultado.atualizados} atualizado(s)
                {resultado.ignorados.length > 0 && `, ${resultado.ignorados.length} ignorado(s)`}.
              </p>
              {resultado.ignorados.length > 0 && (
                <ul className="grid max-h-48 gap-1 overflow-y-auto text-[13px]">
                  {resultado.ignorados.map((i, indice) => (
                    <li key={`${i.linha}-${indice}`} className="flex gap-2">
                      <span className="w-16 shrink-0 font-mono tabular-nums text-muted-foreground">
                        Linha {i.linha}
                      </span>
                      <span className="min-w-0 break-words">{i.motivo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={importar.isPending} onClick={onFechar}>
              {resultado ? "Fechar" : "Cancelar"}
            </Button>
            <Button type="submit" variant="action" disabled={importar.isPending || !arquivo}>
              {importar.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
