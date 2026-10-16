"use client";

import { useParams } from "next/navigation";

import { TelaDeFeedback } from "@/components/rh/desempenho/tela-de-feedback";
import { RhNav } from "@/components/rh/rh-nav";

// Preencher o feedback de um funcionário num ciclo. A permissão é a da área rh:desempenho (pode-ver.ts) e o
// servidor confere de novo em cada chamada.
export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col gap-4">
      <RhNav />
      <TelaDeFeedback avaliacaoId={id} />
    </div>
  );
}
