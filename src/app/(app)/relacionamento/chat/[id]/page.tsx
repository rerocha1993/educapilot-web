"use client";

import { useParams } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { PainelDaConversa } from "@/components/relacionamento/chat/painel-da-conversa";
import { Button } from "@/components/ui/button";
import { useAlterarSituacaoDaConversa, useConversaDaEscola } from "@/lib/relacionamento/use-chat";

export default function ConversaDaEscolaPage() {
  const { id } = useParams<{ id: string }>();
  const { data: conversa, isLoading, isError } = useConversaDaEscola(id);
  const alterar = useAlterarSituacaoDaConversa();

  const arquivada = conversa?.status === "Arquivada";

  function alternar() {
    alterar.mutate(
      { conversaId: id, acao: arquivada ? "reabrir" : "arquivar" },
      {
        onSuccess: () => toast.success(arquivada ? "Conversa reaberta." : "Conversa arquivada."),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível alterar a conversa."),
      }
    );
  }

  return (
    // A chave é o id: trocar de conversa recomeça a rolagem, a caixa de texto e o anexo.
    <PainelDaConversa
      key={id}
      lado="escola"
      conversaId={id}
      conversa={conversa}
      carregandoConversa={isLoading}
      erroDaConversa={isError}
      voltarHref="/relacionamento/chat"
      acoes={
        conversa && (
          <Button type="button" variant="outline" size="sm" onClick={alternar} disabled={alterar.isPending}>
            {arquivada ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            {arquivada ? "Reabrir" : "Arquivar"}
          </Button>
        )
      }
      aviso={
        arquivada && (
          <p role="status" className="border-t border-border bg-muted px-3 py-2 text-[13px] text-muted-foreground">
            Conversa arquivada. Reabra para continuar a conversa.
          </p>
        )
      }
      somenteLeitura={arquivada}
    />
  );
}
