"use client";

import { useParams } from "next/navigation";

import { TelaDaMinhaAvaliacao } from "@/components/desempenho/tela-da-minha-avaliacao";

// Uma avaliação minha: a autoavaliação (editável enquanto rascunho) ou um feedback do gestor compartilhado comigo.
export default function MinhaAvaliacaoPage() {
  const { id } = useParams<{ id: string }>();
  return <TelaDaMinhaAvaliacao avaliacaoId={id} />;
}
