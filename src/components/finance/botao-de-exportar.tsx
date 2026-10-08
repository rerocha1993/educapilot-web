"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * "Exportar": baixa a planilha do que está na tela. Quem usa passa a função que faz o download
 * (ver exportarLancamentosDoMes e exportarOrcamentoDoAno em use-importacao.ts).
 */
export function BotaoDeExportar({
  onExportar,
  className,
}: {
  onExportar: () => Promise<void>;
  className?: string;
}) {
  const [baixando, setBaixando] = useState(false);

  async function exportar() {
    setBaixando(true);
    try {
      await onExportar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível exportar a planilha.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Button variant="outline" className={className} disabled={baixando} onClick={exportar}>
      <Download />
      {baixando ? "Preparando..." : "Exportar"}
    </Button>
  );
}
