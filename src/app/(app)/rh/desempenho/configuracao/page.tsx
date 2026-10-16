"use client";

import { PainelDeConfiguracao } from "@/components/rh/desempenho/painel-de-configuracao";
import { RhNav } from "@/components/rh/rh-nav";

// Configuração do desempenho: pesos e faixas da nota, formulário de feedback e ciclos (área rh:desempenho).
export default function ConfiguracaoDoDesempenhoPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />
      <PainelDeConfiguracao />
    </div>
  );
}
