"use client";

import { PainelDaEquipe } from "@/components/rh/desempenho/painel-da-equipe";
import { RhNav } from "@/components/rh/rh-nav";

// Desempenho da equipe (área rh:desempenho). Dado sensível de trabalhador: a nota é apoio à decisão, não decisão.
export default function DesempenhoPage() {
  return (
    <div className="flex flex-col gap-4">
      <RhNav />
      <PainelDaEquipe />
    </div>
  );
}
