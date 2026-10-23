"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ErroDeCarga } from "@/components/rh/campo";
import { FormularioDeFeedback } from "@/components/rh/desempenho/tela-de-feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData } from "@/lib/format/date";
import type { Avaliacao } from "@/lib/rh/use-desempenho";
import {
  useConcluirAutoavaliacao,
  useContestar,
  useMinhaAvaliacao,
  useSalvarAutoavaliacao,
} from "@/lib/rh/use-meu-desempenho";

/** Contestação ou observação do funcionário (direito à revisão, LGPD art. 20): fica registrada e a gestão a vê. */
function Contestacao({ avaliacao }: { avaliacao: Avaliacao }) {
  const contestar = useContestar();
  const [texto, setTexto] = useState(avaliacao.contestacao ?? "");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 5) return toast.error("Escreva a sua contestação ou observação (ao menos 5 caracteres).");
    try {
      await contestar.mutateAsync({ id: avaliacao.id, texto: texto.trim() });
      toast.success("Sua contestação foi registrada e a gestão poderá vê-la.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a contestação.");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Contestação ou observação">
      <h3 className="font-heading text-base font-semibold">Contestação ou observação</h3>
      <p className="text-[12.5px] text-muted-foreground">
        Discorda de algo ou quer acrescentar um contexto? Escreva aqui. Fica registrado junto do feedback
        {avaliacao.contestacaoEm ? ` (última vez em ${formatarSoData(avaliacao.contestacaoEm)})` : ""}, e você pode pedir a revisão à
        gestão: a nota é apoio à decisão, não decisão automatizada.
      </p>
      <form onSubmit={enviar} noValidate className="mt-2 grid gap-2">
        <Textarea aria-label="Contestação ou observação" rows={3} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="flex justify-end">
          <Button type="submit" variant="action" disabled={contestar.isPending}>
            {contestar.isPending ? "Registrando..." : avaliacao.contestacao ? "Atualizar contestação" : "Registrar contestação"}
          </Button>
        </div>
      </form>
    </section>
  );
}

/**
 * Uma avaliação minha: a autoavaliação em rascunho (editável, com salvamento automático) ou uma avaliação já concluída
 * (a minha, ou a do gestor que foi compartilhada comigo), só para leitura, com o campo de contestação.
 */
export function TelaDaMinhaAvaliacao({ avaliacaoId }: { avaliacaoId: string }) {
  const router = useRouter();
  const { data, isError, isFetchedAfterMount, refetch } = useMinhaAvaliacao(avaliacaoId);
  const salvar = useSalvarAutoavaliacao();
  const concluir = useConcluirAutoavaliacao();

  if (isError) return <ErroDeCarga texto="Não foi possível carregar a avaliação." onTentar={() => refetch()} />;
  if (!data || !isFetchedAfterMount)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );

  const minha = data.tipo === "Auto";
  return (
    <FormularioDeFeedback
      key={data.id}
      avaliacao={data}
      operacoes={{
        salvar: (respostas) => salvar.mutateAsync({ id: data.id, respostas }),
        concluir: () => concluir.mutateAsync(data.id),
      }}
      voltarHref="/meu-desempenho"
      rotuloVoltar="Meu desempenho"
      aviso={
        minha
          ? "A sua autoavaliação: não entra na nota, serve de conversa com a gestão. Nada é enviado até você concluir."
          : `Feedback da gestão${data.avaliadorNome ? ` (${data.avaliadorNome})` : ""}, compartilhado com você.`
      }
      apos={() => router.push("/meu-desempenho")}
      rodape={data.status === "Concluida" ? <Contestacao avaliacao={data} /> : undefined}
    />
  );
}
