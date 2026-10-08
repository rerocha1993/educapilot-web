"use client";

import { Camera, ShieldCheck } from "lucide-react";

import { useAutorizacaoDeImagem } from "@/lib/relacionamento/use-conteudo";

/**
 * Faixa de aviso sobre o uso de imagem dos alunos da turma. É só um aviso: não impede publicar,
 * porque quem decide se a criança entra na foto é a professora.
 *
 * Quem não tem autorização registrada (disse "não" ou nunca foi perguntado) aparece pelo nome.
 * Turma sem aluno cadastrado, ou falha ao conferir, não mostra nada: um aviso errado ensina a
 * ignorar o certo.
 */
export function AvisoDeAutorizacaoDeImagem({ classId }: { classId: number | null }) {
  const { data } = useAutorizacaoDeImagem(classId);
  if (!data || data.total === 0) return null;

  const nomes = data.alunosSemAutorizacao;
  const quantos = nomes.length > 0 ? nomes.length : data.naoAutorizados + data.naoInformados;

  if (quantos === 0) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-soft-foreground"
      >
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>Todos os {data.total} alunos da turma têm autorização de uso de imagem.</span>
      </p>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground"
    >
      <Camera aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 break-words">
        <span className="font-semibold">
          {quantos} {quantos === 1 ? "aluno sem autorização" : "alunos sem autorização"} de uso de imagem registrada
          {nomes.length > 0 ? ": " : "."}
        </span>
        {nomes.length > 0 && nomes.join(", ")}
        <span className="mt-0.5 block text-[13px] opacity-90">
          Evite publicar fotos em que {quantos === 1 ? "ele aparece" : "eles aparecem"}. A situação se altera no cadastro do
          aluno.
        </span>
      </p>
    </div>
  );
}
